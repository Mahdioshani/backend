import {
  GameEngineEventType,
  GameEvent,
  PlayerActionCommandPRCPayload,
  PlayerActionCommandPRCResponse,
  PlayerLeftCommandPRCPayload,
  PlayerLeftCommandPRCResponse,
} from '@PeleyGame/game-engine-sdk';
import {
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { BaseGameEngineService } from '../common/base/base-game-engine.service';
import {XO_UPDATE_TUNE} from './ludo.action';
import {
  ReconnectEvent,
  TUNE_UPDATED_EVENT,
  TURN_TIMED_OUT,
} from './ludo.event';
import { LudoState, posToSubBoardId } from './ludo.state';
import { IMove, turn } from './ludo.types';

export class XOService extends BaseGameEngineService<LudoState> {
  private readonly TURN_TIMEOUT = 5000;

  private readonly logger = new Logger(XOService.name);
  games: Map<string, LudoState> = new Map();
  private turnTimers: Map<string, { timer: any; startTime: number }> =
    new Map();
  minimumPlayers: number = 2;

  private startTurnTimer(matchId: string, playerId: number) {
    console.log("StarrrtinnnggggTuurrrnTiiimmeerrr");
    this.clearTurnTimer(matchId);
    const timer = setTimeout(() => {
      this.handleTurnTimeout(matchId, playerId);
    }, this.TURN_TIMEOUT);
    const _startTime = Date.now();
    this.turnTimers.set(matchId, {
      timer: timer,
      startTime: _startTime,
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
    await this.handleTurnTimeout(matchId, state.players[0].playerId);
    state = new LudoState(matchId, [100, 200]);
    if (state.players) {
      return;
    }
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
      //LastTurn: state.LastTurn,
      players: state.players,
      stateVersion: state.getStateVersion(),
      remainingTime: this.getRemainingTime(matchId),
    });

    return resultReconnect;
  }

  private async handleTurnTimeout(matchId: string, playerId: number) {
    const state = this.games.get(matchId);
    console.log("helloooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo", playerId);
    console.log(".....................................................",state.LastTurn)
    if (!state || !state.LastTurn.playerId) {
      return;
    }
    const player = state.players.find((player) => player.playerId === playerId);
    player.faultCount += 1;
    console.log("Playerrrrrrrffauuuualllltcooouuuunttt", player.faultCount)
    // Publish turn timeout event
    const timeoutEvent = new GameEvent(
      matchId,
      TURN_TIMED_OUT,
      player,
      state.getStateVersion(),
    );
    this.publishServerEvent(
      matchId,
      GameEngineEventType.MATCH_EVENT,
      timeoutEvent,
    );
    if (player.faultCount >= 5) {
      if (!player.isLeftTheGame) {
        await this.leftPlayer({ matchId: matchId, playerId: playerId });
      }
      await this.autoPlay(matchId, playerId);
      return;
    } else {
      await this.autoPlay(matchId, playerId);
    }
    // Skip the player's turn
  }

  private async updateTune(state: LudoState, move: IMove | undefined) {
    console.log("UPdating tuneee000000000000000000000000000000000");
    const currentTurnPlayerId = state.handleMove(move);
    
    const event = new GameEvent(
      state.id,
      TUNE_UPDATED_EVENT,
      currentTurnPlayerId,
      state.getStateVersion(),
    );

    this.publishServerEvent(state.id, GameEngineEventType.MATCH_EVENT, event);

    // Start the timer for the new turn
    if (!currentTurnPlayerId.has_error){
      this.startTurnTimer(state.id, currentTurnPlayerId.playerId);
    }
  }

  public initSetupTheGameState(
    matchId: string,
    playerIds: number[],
  ): LudoState {
    const state = new LudoState(matchId, playerIds);
    return state;
  }

  public async autoPlay(matchId: string, playerId: number) {
    const state = this.games.get(matchId);
    if (!state || state.LastTurn.playerId === playerId) {
      return;
    }
    // select random move
    console.log("AUUUUTOOOOOOOOOOOOOOOOOOOOOPLAAAAAAAAAAAAAYINNNNGGGGGGGGGGGGGGGGGGGGGG");
    const randomMove = state.LastTurn.move;
    const x = randomMove.xPos;
    const y = randomMove.yPos;
    const sub_id = 3 * x + y;
    let move: IMove;
    let is_set: boolean = false;
    const temp_turn: turn =
      state.LastTurn.move.turn === turn.X ? turn.O : turn.X;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (state.SubBoards[sub_id].table[i][j] === 'Z') {
          move = { xPos: i, yPos: j, subBoard_id: sub_id, turn: temp_turn };
          is_set = true;
        }
      }
    }
    if (!is_set) {
      for (let k = 0; k < state.SubBoards.length; k++) {
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (state.SubBoards[k].table[i][j] === 'Z') {
              move = { xPos: i, yPos: j, subBoard_id: k, turn: temp_turn };
              is_set = true;
            }
          }
        }
      }
    }
    await this.updateTune(state, move);
  }

  async endGame(matchId: string) {
    this.clearTurnTimer(matchId);
  }

  // private rollDice(playerId: number, state: LudoState, diceValue?: number) {
  //   // roll dice
  //   const rolledDice = state.rollDice(playerId, diceValue);
  //   const event = new GameEvent(
  //     state.id,
  //     ROLLED_DICE_EVENT,
  //     new LudoRolledDiceEvent({
  //       playerId: rolledDice.playerId,
  //       diceValue: rolledDice.diceValue,
  //       options: rolledDice.options,
  //       continuousSixDiceCount: rolledDice.continuousSixDiceCount,
  //     }),
  //     state.getStateVersion(),
  //   );
  //
  //   this.publishServerEvent(
  //     state.id,
  //     GameEngineEventType.MATCH_EVENT,
  //     event,
  //   );
  //   if (rolledDice.options.length === 0) {
  //     this.updateTune(state)
  //   }
  // }

  // private capturing(event: LudoPieceMovedEvent, state: LudoState) {
  //   if (event.move?.afterMove?.position?.type !== positionType.MAIN_ROAD) {
  //     return;
  //   }
  //   const indexIsSafe = safeZone.includes(event.move.afterMove.position.index);
  //   if (indexIsSafe) {
  //     return;
  //   }
  //   const getPiecesOfThisPosition = state.getPiecesOfPosition(event.move.afterMove.position);
  //   const capturedPieces = getPiecesOfThisPosition.filter(piece => piece.playerId !== event.playerId).map(piece => {
  //     return state.movePieceTo(piece.playerId, piece.pieceId, pieceStatus.OUT, null);
  //   })
  //   capturedPieces.forEach(PieceMove => {
  //     const event = new GameEvent(
  //       state.id,
  //       PIECE_CAPTURED_EVENT,
  //       new LudoPieceMovedEvent({
  //         playerId: PieceMove.playerId,
  //         pieceId: PieceMove.pieceId,
  //         move: PieceMove.move
  //       }),
  //       state.getStateVersion(),
  //     );
  //     this.publishServerEvent(
  //       state.id,
  //       GameEngineEventType.MATCH_EVENT,
  //       event,
  //     );
  //   })
  //   return capturedPieces;
  // }

  // private movePiece(
  //   playerId: number,
  //   pieceId: number,
  //   state: LudoState,
  //   moveValue?: { position: IPosition, status: pieceStatus }
  // ): void {
  //   let moveResult: {
  //     playerId: number;
  //     pieceId: number;
  //     move: IMove;
  //   } = null;
  //   let hasPrize = false;
  //   if (moveValue) {
  //     moveResult = state.movePieceTo(playerId, pieceId, moveValue.status, moveValue.position);
  //   } else {
  //     moveResult = state.movePiece(playerId, pieceId);
  //
  //   }
  //   if (moveResult.move.afterMove.pieceStatus === pieceStatus.WON) {
  //     hasPrize = true;
  //   }
  //   const moveEvent = new LudoPieceMovedEvent({
  //     playerId: moveResult.playerId,
  //     pieceId: moveResult.pieceId,
  //     move: moveResult.move
  //   });
  //   const event = new GameEvent(
  //     state.id,
  //     PIECE_MOVED_EVENT,
  //     moveEvent,
  //     state.getStateVersion(),
  //   );
  //   this.publishServerEvent(
  //     state.id,
  //     GameEngineEventType.MATCH_EVENT,
  //     event,
  //   );
  //   // check win
  //   const isWon = state.checkWon(playerId);
  //   if (isWon) {
  //     this.baseEndTheMatch(state.id);
  //   }
  //   // Check for capturing opponent pieces
  //   const capturedPieces = this.capturing(moveEvent, state);
  //   // has prize?
  //   if (capturedPieces?.length > 0) {
  //     hasPrize = true;
  //   }
  //
  //   this.updateTune(state, hasPrize);
  // }

  // private validateParsedAction(action: ParsedCheat): boolean {
  //   switch (action.type) {
  //     case 'move_main':
  //       return action.values.length === 2 && action.values[0] <= 4 && action.values[1] <= 51;
  //     case 'move_side':
  //       return action.values.length === 2 && action.values[0] <= 4 && action.values[1] <= 4;
  //     case 'roll_dice':
  //       return action.values.length === 1 && action.values[0] >= 1 && action.values[0] <= 6;
  //     default:
  //       return false;
  //   }
  // }
  //
  // private parseGameAction(input: string): ParsedCheat | null {
  //   for (const [actionType, pattern] of Object.entries(this.CHEAT_PATTERNS)) {
  //     const match = input.match(pattern);
  //     if (match) {
  //       const values = match.slice(1).map(Number);
  //       return {
  //         type: actionType as CheatType,
  //         values
  //       };
  //     }
  //   }
  //   return null;
  // }
  //
  // private parseAndValidateGameAction(code: string): ParsedCheat | null {
  //   const parsedAction = this.parseGameAction(code);
  //   if (parsedAction && this.validateParsedAction(parsedAction)) {
  //     return parsedAction;
  //   }
  //   return null;
  // }
  //
  // private async cheatAction(playerId: number, code: string, state: LudoState) {
  //   const cheatData = this.parseAndValidateGameAction(code);
  //   if (!cheatData) {
  //     throw new Error('invalid cheat code');
  //   }
  //   switch (cheatData.type) {
  //     case "move_main": {
  //       const pieceId = cheatData.values[0];
  //       const index = cheatData.values[1];
  //       const status = pieceStatus.PLAYING;
  //       const position: IPosition = {
  //         index: index,
  //         type: positionType.MAIN_ROAD
  //       }
  //       this.movePiece(playerId, pieceId, state, {
  //         position,
  //         status
  //       })
  //       break;
  //     }
  //     case "move_side": {
  //       const pieceId = cheatData.values[0];
  //       const index = cheatData.values[1];
  //       const status = pieceStatus.PLAYING;
  //       const position: IPosition = {
  //         index: index,
  //         type: positionType.SIDE_ROAD
  //       }
  //       this.movePiece(playerId, pieceId, state, {
  //         position,
  //         status
  //       })
  //       break;
  //     }
  //     case "roll_dice": {
  //       const dice_value = cheatData.values[0];
  //       this.rollDice(playerId, state, dice_value);
  //       break;
  //     }
  //   }
  //
  // }

  public async processUserAction(
    // payload: PlayerActionCommandPRCPayload<any>,
    payload : any, 
  ): Promise<PlayerActionCommandPRCResponse> {
    const { matchId, playerId, actionName, data } = payload;
    const error : string[] = []
    const state = this.games.get(matchId);
    if (!state) {
      console.log(matchId);
      for (let game in this.games.keys){
        console.log(this.games[game].matchId);
      }
      throw new NotFoundException('game is not found');
    }

    if (state.LastTurn.playerId === playerId) {
      console.log("mannn koskholam");
      throw new NotAcceptableException('It is not your turn');
    }
    // TODO check acceptable action
    if (error.length === 0){
      switch (actionName) {
        case XO_UPDATE_TUNE: {
          console.log("==========>;jawnvipanvjasvhbasdjgn", data);
          console.log(":::::::::::::::", payload);
          const move : IMove = {
            subBoard_id : data.subBoard_id,
            xPos : data.xPos,
            yPos : data.yPos,
            turn : data.turn
          }
          await this.updateTune(state, move);
          if (state.Conclusion !== 'RUNNING') {
            await this.baseEndTheMatch(state.id);
          }
        }
      }
    }
    return {
      success: true,
    };
  }
  

  public async leftPlayer(
    cmd: PlayerLeftCommandPRCPayload,
  ): Promise<PlayerLeftCommandPRCResponse> {
    const state = this.games.get(cmd.matchId);
    if (!state) {
      throw new NotFoundException('game is not found');
    }
    return this.basePlayerLeft(cmd);
  }
}
