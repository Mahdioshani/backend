
import { BaseGameEngineService } from "../common/base/base-game-engine.service";
import { LudoState, safeZone } from "./ludo.state";
import { Logger, NotAcceptableException, NotFoundException } from "@nestjs/common";
import { CHEAT_ACTION, LudoCheatAction, LudoPlayerSelectPieceAction, ROLL_DICE_ACTION, SELECT_PIECE_ACTION } from "./ludo.action";
import { LudoPieceMovedEvent, LudoRolledDiceEvent, LudoTuneUpdatedEvent, PIECE_CAPTURED_EVENT, PIECE_MOVED_EVENT, ReconnectEvent, ROLLED_DICE_EVENT, TUNE_UPDATED_EVENT, TURN_TIMED_OUT } from "./ludo.event";
import { plainToInstance } from "class-transformer";
import { CheatType, IMove, IPosition, ParsedCheat, pieceStatus, positionType } from "./ludo.types";
import { PlayerActionCommandPRCPayload, PlayerActionCommandPRCResponse, PlayerLeftCommandPRCPayload, PlayerLeftCommandPRCResponse } from "@PeleyGame/game-engine-sdk";
import { GameEngineEventType, GameEvent } from "@PeleyGame/game-engine-sdk";

export class LudoService extends BaseGameEngineService<LudoState> {
  private readonly TURN_TIMEOUT = 60000;

  private readonly CHEAT_PATTERNS = {
    move_main: /^move_main_(\d+)_(\d+)$/,
    move_road: /^move_road_(\d+)_(\d+)$/,
    roll_dice: /^roll_dice_(\d+)$/
  };

  private readonly logger = new Logger(LudoService.name);
  games: Map<string, LudoState> = new Map();
  private turnTimers: Map<string, { timer: any, startTime: number; }> = new Map();
  minimumPlayers: number = 2;

  private startTurnTimer(matchId: string, playerId: number) {
    this.clearTurnTimer(matchId);
    const timer = setTimeout(() => {
      this.handleTurnTimeout(matchId, playerId);
    }, this.TURN_TIMEOUT);
    const _startTime = Date.now();
    this.turnTimers.set(matchId, {
      timer: timer,
      startTime: _startTime
    });
  }

  private clearTurnTimer(matchId: string) {
    const existingTimer = this.turnTimers.get(matchId);
    if (existingTimer) {
      clearTimeout(existingTimer.timer);
      this.turnTimers.delete(matchId);
    }
  }

  private getRemainingTime(matchId: string) {
    const existingTimer = this.turnTimers.get(matchId);
    if (existingTimer) {
      const elapsedTime = Date.now() - existingTimer.startTime;
      return Math.max(this.TURN_TIMEOUT - elapsedTime, 0);
    }
    return 0;
  }

  async startGame(matchId: string, state: LudoState) {
    // pick random player id for starting
    // this.updateTune(state);

    
  }

  async reconnectToGame(matchId: string): Promise<any> {
    const state = this.games.get(matchId);
    if (!state) {
      throw new NotFoundException('game is not found');
    }
    this.logger.log('reconnect to game', {
      matchId,
    });

    const resultReconnect = new ReconnectEvent({
      id: state.id,
      LastTurn: state.LastTurn,
      players: state.players,
      stateVersion: state.getStateVersion(),
      remainingTime: this.getRemainingTime(matchId)
    });

    return resultReconnect;
  }

  private async handleTurnTimeout(matchId: string, playerId: number) {
    const state = this.games.get(matchId);
    if (!state || state.LastTurn.playerId !== playerId) {
      return;
    }
    const player = state.players.find(player => player.playerId === playerId);
    player.faultCount += 1;
    // Publish turn timeout event
    const timeoutEvent = new GameEvent(
      matchId,
      TURN_TIMED_OUT,
      player,
      state.getStateVersion()
    );
    this.publishServerEvent(
      matchId,
      GameEngineEventType.MATCH_EVENT,
      timeoutEvent
    );
    if (player.faultCount >= 5) {
      if (!player.isLeftTheGame) {
        await this.leftPlayer({ matchId: matchId, playerId: playerId })
      }
      state.LastTurn.diceValue = null;
      this.updateTune(state);
      return;
    }
    if (state.LastTurn.step === "ROLL_DICE") {
      this.rollDice(playerId, state);
    }
    if (state.LastTurn.options.length > 0) {
      this.autoPlay(matchId, playerId);
    }
    // Skip the player's turn

  }

  private async updateTune(state: LudoState, hasPrize?: boolean) {
    const currentTurnPlayerId = state.updateTurn(hasPrize);
    const playerData = state.players.find(player => player.playerId === currentTurnPlayerId)
    const event = new GameEvent(
      state.id,
      TUNE_UPDATED_EVENT,
      new LudoTuneUpdatedEvent(
        playerData
      ),
      state.getStateVersion(),
    );

    this.publishServerEvent(
      state.id,
      GameEngineEventType.MATCH_EVENT,
      event,
    );

    // Start the timer for the new turn
    this.startTurnTimer(state.id, currentTurnPlayerId);
  }

  public initSetupTheGameState(matchId: string, playerIds: number[]): LudoState {
    const state = new LudoState(matchId, playerIds);
    this.updateTune(state);
    return state;
  }

  public async autoPlay(matchId: string, playerId: number) {
    const state = this.games.get(matchId);
    if (!state || state.LastTurn.playerId !== playerId) {
      return;
    }
    if (!state.LastTurn.options.length) {
      return;
    }
    // select random move 
    const randomMove = state.LastTurn.options[0];
    this.movePiece(playerId, randomMove.pieceId, state);
  }

  async endGame(matchId: string) {
    this.clearTurnTimer(matchId);
  }

  private rollDice(playerId: number, state: LudoState, diceValue?: number) {
    // roll dice
    const rolledDice = state.rollDice(playerId, diceValue);
    const event = new GameEvent(
      state.id,
      ROLLED_DICE_EVENT,
      new LudoRolledDiceEvent({
        playerId: rolledDice.playerId,
        diceValue: rolledDice.diceValue,
        options: rolledDice.options,
        continuousSixDiceCount: rolledDice.continuousSixDiceCount,
      }),
      state.getStateVersion(),
    );

    this.publishServerEvent(
      state.id,
      GameEngineEventType.MATCH_EVENT,
      event,
    );
    if (rolledDice.options.length === 0) {
      this.updateTune(state)
    }
  }

  private capturing(event: LudoPieceMovedEvent, state: LudoState) {
    if (event.move?.afterMove?.position?.type !== positionType.MAIN_ROAD) {
      return;
    }
    const indexIsSafe = safeZone.includes(event.move.afterMove.position.index);
    if (indexIsSafe) {
      return;
    }
    const getPiecesOfThisPosition = state.getPiecesOfPosition(event.move.afterMove.position);
    const capturedPieces = getPiecesOfThisPosition.filter(piece => piece.playerId !== event.playerId).map(piece => {
      return state.movePieceTo(piece.playerId, piece.pieceId, pieceStatus.OUT, null);
    })
    capturedPieces.forEach(PieceMove => {
      const event = new GameEvent(
        state.id,
        PIECE_CAPTURED_EVENT,
        new LudoPieceMovedEvent({
          playerId: PieceMove.playerId,
          pieceId: PieceMove.pieceId,
          move: PieceMove.move
        }),
        state.getStateVersion(),
      );
      this.publishServerEvent(
        state.id,
        GameEngineEventType.MATCH_EVENT,
        event,
      );
    })
    return capturedPieces;
  }

  private movePiece(
    playerId: number,
    pieceId: number,
    state: LudoState,
    moveValue?: { position: IPosition, status: pieceStatus }
  ): void {
    let moveResult: {
      playerId: number;
      pieceId: number;
      move: IMove;
    } = null;
    let hasPrize = false;
    if (moveValue) {
      moveResult = state.movePieceTo(playerId, pieceId, moveValue.status, moveValue.position);
    } else {
      moveResult = state.movePiece(playerId, pieceId);

    }
    if (moveResult.move.afterMove.pieceStatus === pieceStatus.WON) {
      hasPrize = true;
    }
    const moveEvent = new LudoPieceMovedEvent({
      playerId: moveResult.playerId,
      pieceId: moveResult.pieceId,
      move: moveResult.move
    });
    const event = new GameEvent(
      state.id,
      PIECE_MOVED_EVENT,
      moveEvent,
      state.getStateVersion(),
    );
    this.publishServerEvent(
      state.id,
      GameEngineEventType.MATCH_EVENT,
      event,
    );
    // check win
    const isWon = state.checkWon(playerId);
    if (isWon) {
      this.baseEndTheMatch(state.id);
    }
    // Check for capturing opponent pieces
    const capturedPieces = this.capturing(moveEvent, state);
    // has prize?
    if (capturedPieces?.length > 0) {
      hasPrize = true;
    }

    this.updateTune(state, hasPrize);
  }

  private validateParsedAction(action: ParsedCheat): boolean {
    switch (action.type) {
      case 'move_main':
        return action.values.length === 2 && action.values[0] <= 4 && action.values[1] <= 51;
      case 'move_side':
        return action.values.length === 2 && action.values[0] <= 4 && action.values[1] <= 4;
      case 'roll_dice':
        return action.values.length === 1 && action.values[0] >= 1 && action.values[0] <= 6;
      default:
        return false;
    }
  }

  private parseGameAction(input: string): ParsedCheat | null {
    for (const [actionType, pattern] of Object.entries(this.CHEAT_PATTERNS)) {
      const match = input.match(pattern);
      if (match) {
        const values = match.slice(1).map(Number);
        return {
          type: actionType as CheatType,
          values
        };
      }
    }
    return null;
  }

  private parseAndValidateGameAction(code: string): ParsedCheat | null {
    const parsedAction = this.parseGameAction(code);
    if (parsedAction && this.validateParsedAction(parsedAction)) {
      return parsedAction;
    }
    return null;
  }

  private async cheatAction(playerId: number, code: string, state: LudoState) {
    const cheatData = this.parseAndValidateGameAction(code);
    if (!cheatData) {
      throw new Error('invalid cheat code');
    }
    switch (cheatData.type) {
      case "move_main": {
        const pieceId = cheatData.values[0];
        const index = cheatData.values[1];
        const status = pieceStatus.PLAYING;
        const position: IPosition = {
          index: index,
          type: positionType.MAIN_ROAD
        }
        this.movePiece(playerId, pieceId, state, {
          position,
          status
        })
        break;
      }
      case "move_side": {
        const pieceId = cheatData.values[0];
        const index = cheatData.values[1];
        const status = pieceStatus.PLAYING;
        const position: IPosition = {
          index: index,
          type: positionType.SIDE_ROAD
        }
        this.movePiece(playerId, pieceId, state, {
          position,
          status
        })
        break;
      }
      case "roll_dice": {
        const dice_value = cheatData.values[0];
        this.rollDice(playerId, state, dice_value);
        break;
      }
    }

  }

  public async processUserAction(payload: PlayerActionCommandPRCPayload<any>): Promise<PlayerActionCommandPRCResponse> {
    const { matchId, playerId, actionName, data } = payload;

    const state = this.games.get(matchId);
    if (!state) {
      throw new NotFoundException('game is not found');
    }

    if (state.LastTurn.playerId !== playerId) {
      throw new NotAcceptableException('It is not your turn');
    }
    // TODO check acceptable action
    switch (actionName) {
      case ROLL_DICE_ACTION:
        {
          this.rollDice(playerId, state);
          break;
        };
      case SELECT_PIECE_ACTION:
        {
          const selectPieceAction = plainToInstance(LudoPlayerSelectPieceAction, data);

          this.movePiece(playerId, selectPieceAction.piece_id, state);
          break;
        };
      case CHEAT_ACTION:
        {
          const cheatAction = plainToInstance(LudoCheatAction, data);
          this.cheatAction(playerId, cheatAction.code, state);
          break;
        };
    }
    return {
      success: true
    };
  }

  public async leftPlayer(cmd: PlayerLeftCommandPRCPayload): Promise<PlayerLeftCommandPRCResponse> {
    const state = this.games.get(cmd.matchId);
    if (!state) {
      throw new NotFoundException('game is not found');
    }
    const playerLeftResult = state.resetAllPlayerPiece(cmd.playerId);
    return this.basePlayerLeft(cmd, playerLeftResult);
  }
}