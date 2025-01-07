import { ClientProxy } from '@nestjs/microservices';
import { ConflictException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { GameEngineState } from './base-game-engine.state';
import { sendEventTopic } from '@PeleyGame/game-engine-sdk';
import {
  GameSetupCommandPRCPayload,
  GameSetupCommandPRCResponse,
  PlayerDisconnectCommandPRC,
  PlayerDisconnectCommandPRCPayload,
  PlayerDisconnectCommandPRCResponse,
  PlayerLeftCommandPRCPayload,
  PlayerLeftCommandPRCResponse,
  PlayerReconnectCommandPRCPayload,
  PlayerReconnectCommandPRCResponse
} from '@PeleyGame/game-engine-sdk';
import { GameEngineEvent, GameEngineEventType, GameEvent } from '@PeleyGame/game-engine-sdk';


export abstract class BaseGameEngineService<State extends GameEngineState> {
  private readonly baseLogger = new Logger(BaseGameEngineService.name);
  abstract games: Map<string, GameEngineState>;
  abstract minimumPlayers: number;
  constructor(@Inject('GAME_ENGINE_SERVICE') private client: ClientProxy) { }

  abstract initSetupTheGameState(matchId: string, playerIds: number[]): GameEngineState;
  abstract endGame(matchId: string, state: State): Promise<void>;
  abstract startGame(matchId: string, state: State): Promise<void>;
  abstract reconnectToGame(matchId: string): Promise<PlayerReconnectCommandPRCResponse>;
  protected publishServerEvent<T = any>(
    matchId: string,
    actionType: GameEngineEventType,
    event: GameEvent<T>,
  ) {
    try {
      this.client.emit(
        sendEventTopic(actionType),
        new GameEngineEvent(matchId, event),
      );
    } catch (err) {
      console.log(err);
    }
  }

  private async setupEvent(matchId: string, state: GameEngineState, payload: GameSetupCommandPRCPayload): Promise<GameEvent> {
    const event = new GameEvent(
      matchId,
      GameEngineEventType.MATCH_SETUP,
      {
        ...payload
      },
      state.getStateVersion()
    );
    return event;
  }

  private async startEvent(matchId: string, state: GameEngineState): Promise<GameEvent> {
    const event = new GameEvent(
      matchId,
      GameEngineEventType.MATCH_START,
      state,
      state.getStateVersion()
    );
    return event;
  }

  public async baseSetupGame(payload: GameSetupCommandPRCPayload): Promise<GameSetupCommandPRCResponse> {
    const { matchId, playerIds } = payload;
    console.log("====================================================================", payload)
    const state = this.initSetupTheGameState(matchId, playerIds);

    this.games.set(matchId, state);
    const event = await this.setupEvent(matchId, state, payload);
    this.publishServerEvent(matchId, GameEngineEventType.MATCH_SETUP, event);
    this.baseStartGame(payload.matchId);
    return {
      success: true
    };
  }

  public async baseStartGame(matchId: string) {
    const state = this.games.get(matchId);

    if (!state) {
      throw new NotFoundException('game is not found');
    }

    const event = await this.startEvent(matchId, state);

    this.publishServerEvent(
      matchId,
      GameEngineEventType.MATCH_START,
      event,
    );
    // with this timeout MATCH_START event fire on time
    this?.startGame && setTimeout(async () => {
      await this.startGame(matchId, state as State);
    }, 500)

    // this?.startGame && setTimeout(async () => {
    //   await this.baseEndTheMatch(matchId);
    // }, 10000)
    return event;
  }

  public async baseReconnect(cmd: PlayerReconnectCommandPRCPayload): Promise<PlayerReconnectCommandPRCResponse> {
    const state = this.games.get(cmd.matchId);
    if (!state) {
      throw new NotFoundException('game is not found');
    }
    const applied = state.applyUserReconnectEvent(cmd.playerId);
    if (!applied) {
      this.baseLogger.log(
        'cannot handle reconnect event, for some odd reason player does not exists in this match',
      );
      throw new NotFoundException('game is not found');
    }
    return await this.reconnectToGame(cmd.matchId);
  }

  public async basePlayerLeft(cmd: PlayerLeftCommandPRCPayload, data?: any): Promise<PlayerLeftCommandPRCResponse> {
    this.baseLogger.log('player left event received', {
      cmd
    });
    const state = this.games.get(cmd.matchId);
    if (!state) {
      this.baseLogger.log(
        'cannot handle left event, game state already cleared',
      );
      return { hasEndedMatch: false, success: false, matchId: cmd.matchId, playerId: cmd.playerId };
    }
    const applied = state.applyUserLeftEvent(cmd.playerId);
    if (!applied) {
      this.baseLogger.log(
        'cannot handle left event, for some odd reason player does not exists in this match',
      );
      return { hasEndedMatch: false, success: false, matchId: cmd.matchId, playerId: cmd.playerId };
    }
    const hasEndedMatch = state.getActivePlayers().length < this.minimumPlayers;

    const event = new GameEvent(
      cmd.matchId,
      GameEngineEventType.PLAYER_LEFT,
      data ? data : { playerId: cmd.playerId, hasEndedMatch: hasEndedMatch },
      state.getStateVersion(),
    );

    this.publishServerEvent(
      cmd.matchId,
      GameEngineEventType.PLAYER_LEFT,
      event,
    );
    if (hasEndedMatch) {
      this.baseLogger.log('Player count reached minimum, ending the match', { matchId: cmd.matchId });
      await this.baseEndTheMatch(cmd.matchId);
    }
    this.baseLogger.log('successfully applied player left');
    return { hasEndedMatch: hasEndedMatch, success: true, matchId: cmd.matchId, playerId: cmd.playerId };
  }

  public async baseDisconnect(cmd: PlayerDisconnectCommandPRCPayload): Promise<PlayerDisconnectCommandPRCResponse> {
    this.baseLogger.log('player disconnected event received', {
      cmd
    });

    const state = this.games.get(cmd.matchId);
    if (!state) {
      this.baseLogger.log(
        'cannot handle disconnect event, game state already cleared',
      );
      throw new NotFoundException('game is not found');
    }

    const applied = state.applyUserDisconnectEvent(cmd.playerId);
    if (!applied) {
      this.baseLogger.log(
        'cannot handle disconnect event, for some odd reason player does not exists in this match',
      );
      throw new ConflictException('cannot handle disconnect event');
    }

    const event = new GameEvent(
      cmd.matchId,
      GameEngineEventType.PLAYER_DISCONNECT,
      new PlayerDisconnectCommandPRC({
        matchId: cmd.matchId,
        playerId: cmd.playerId
      }).payload,
      state.getStateVersion(),
    );

    this.publishServerEvent(
      cmd.matchId,
      GameEngineEventType.PLAYER_DISCONNECT,
      event,
    );

    this.baseLogger.log('successfully applied player disconnect');
    return {
      success: true
    };
  }

  public async baseEndTheMatch(matchId: string) {
    const state = this.games.get(matchId);
    if (!state) {
      this.baseLogger.warn(
        'cannot properly end the game, state not found',
        matchId,
      );
      return;
    }
    const gameResult = state.calculateGameResult();

    const event = new GameEvent(
      matchId,
      GameEngineEventType.MATCH_RESULT,
      gameResult,
      state.getStateVersion(),
    );

    this.publishServerEvent(
      matchId,
      GameEngineEventType.MATCH_RESULT,
      event,
    );
    this.games.delete(matchId);

  }
}