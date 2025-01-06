import {
  GameResult,
  PlayerResult,
  ResultStatus,
} from '@PeleyGame/game-engine-sdk';
import { Logger } from '@nestjs/common';
import * as Chance from 'chance';
import { Exclude, Expose } from 'class-transformer';
import { GameEngineState } from '../common/base/base-game-engine.state';
import {
  boardStatus,
  ILastTurn,
  IMove,
  turn,
  XOPlayerState,
  XOSubBoard,
} from './ludo.types';

export const posToSubBoardId = {
  '0,0': 0,
  '0,1': 1,
  '0,2': 2,
  '1,0': 3,
  '1,1': 4,
  '1,2': 5,
  '2,0': 6,
  '2,1': 7,
  '2,2': 8,
};


//startttttttttttttttttttttttttttttttttt

@Exclude()
export class LudoState extends GameEngineState<XOPlayerState> {
  private readonly logger = new Logger(LudoState.name);
  private readonly chance = new Chance();

  @Expose({ name: 'last_turn' })
  public LastTurn: Partial<ILastTurn>;

  @Expose({ name: 'sub_boards' })
  public SubBoards: Array<XOSubBoard>;

  @Expose({ name: 'Conclusion' })
  public Conclusion: boardStatus;

  constructor(matchId: string, playerIds: number[]) {
    super(matchId, playerIds);
    this.LastTurn = {};
    const temp = new Array<XOSubBoard>(9);
    for (let i = 0; i < 9; i++) {
      temp[i] = new XOSubBoard(i, boardStatus.RUNNING);
    }
    this.SubBoards = temp;
    this.Conclusion = boardStatus.RUNNING;
  }

  private isPositionEmpty(position: IMove): boolean {
    const x = position?.xPos;
    const y = position?.yPos;
    const occupied = this.SubBoards[position.subBoard_id].table[x][y];
    return occupied === 'Z';
  }

  private isValidTurn(position: IMove, player: XOPlayerState): boolean {
    if (this?.LastTurn?.move?.turn === player?.turn_symbol) {
      return false;
    }
    return true;
  }

  private isValidSubBoard(position: IMove): boolean {
    if (!this.LastTurn) {
      return true;
    }
    if (this.SubBoards[position.subBoard_id].status !== 'RUNNING') {
      return false;
    }
    const x = this.LastTurn?.move?.xPos;
    const y = this.LastTurn?.move?.yPos;
    const expectedSubBoard: number = posToSubBoardId[x + ',' + y];
    if (this.SubBoards[position.subBoard_id].id === expectedSubBoard) {
      return true;
    }
    if (this.SubBoards[expectedSubBoard].status !== 'RUNNING') {
      return true;
    }
    return false;
  }

  private checkSubBoardCondition(subBoard: XOSubBoard) {
    if (subBoard?.status !== 'RUNNING') {
      return;
    }
    const row1Condition: boolean =
      subBoard.table[0][0] === subBoard.table[0][1] &&
      subBoard.table[0][1] === subBoard.table[0][2] &&
      subBoard.table[0][2] !== 'Z';
    const row2Condition: boolean =
      subBoard.table[1][0] === subBoard.table[1][1] &&
      subBoard.table[1][1] === subBoard.table[1][2] &&
      subBoard.table[1][2] !== 'Z';
    const row3Condition: boolean =
      subBoard.table[2][0] === subBoard.table[2][1] &&
      subBoard.table[2][1] === subBoard.table[2][2] &&
      subBoard.table[2][2] !== 'Z';
    const col1Condition: boolean =
      subBoard.table[0][0] === subBoard.table[1][0] &&
      subBoard.table[1][0] === subBoard.table[2][0] &&
      subBoard.table[2][0] !== 'Z';
    const col2Condition: boolean =
      subBoard.table[0][1] === subBoard.table[1][1] &&
      subBoard.table[1][1] === subBoard.table[2][1] &&
      subBoard.table[2][1] !== 'Z';
    const col3Condition: boolean =
      subBoard.table[0][2] === subBoard.table[1][2] &&
      subBoard.table[1][2] === subBoard.table[2][2] &&
      subBoard.table[2][2] !== 'Z';
    const diag1Condition: boolean =
      subBoard.table[0][0] === subBoard.table[1][1] &&
      subBoard.table[1][1] === subBoard.table[2][2] &&
      subBoard.table[2][2] !== 'Z';
    const diag2Condition: boolean =
      subBoard.table[0][2] === subBoard.table[1][1] &&
      subBoard.table[1][1] === subBoard.table[2][0] &&
      subBoard.table[2][0] !== 'Z';

    if (row1Condition) {
      if (subBoard.table[0][0] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (row2Condition) {
      if (subBoard.table[1][0] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (row3Condition) {
      if (subBoard.table[2][0] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (col1Condition) {
      if (subBoard.table[0][0] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (col2Condition) {
      if (subBoard.table[0][1] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (col3Condition) {
      if (subBoard.table[0][2] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (diag1Condition) {
      if (subBoard.table[0][0] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (diag2Condition) {
      if (subBoard.table[0][2] == 'X') {
        subBoard.status = boardStatus.WINX;
      } else {
        subBoard.status = boardStatus.WINO;
      }
    }
    if (subBoard?.status === 'RUNNING') {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (subBoard.table[i][j] === 'Z') {
            return;
          }
        }
      }
    }
    subBoard.status = boardStatus.DRAW;
  }

  private checkMainBoardCondition() {
    const row1Condition: boolean =
      this.SubBoards[0].status === this.SubBoards[1].status &&
      this.SubBoards[1].status === this.SubBoards[2].status &&
      this.SubBoards[2].status !== boardStatus.DRAW &&
      this.SubBoards[2].status !== boardStatus.RUNNING;
    const row2Condition: boolean =
      this.SubBoards[3].status === this.SubBoards[4].status &&
      this.SubBoards[4].status === this.SubBoards[5].status &&
      this.SubBoards[5].status !== boardStatus.DRAW &&
      this.SubBoards[5].status !== boardStatus.RUNNING;
    const row3Condition: boolean =
      this.SubBoards[6].status === this.SubBoards[7].status &&
      this.SubBoards[7].status === this.SubBoards[8].status &&
      this.SubBoards[8].status !== boardStatus.DRAW &&
      this.SubBoards[8].status !== boardStatus.RUNNING;
    const col1Condition: boolean =
      this.SubBoards[0].status === this.SubBoards[3].status &&
      this.SubBoards[3].status === this.SubBoards[6].status &&
      this.SubBoards[6].status !== boardStatus.DRAW &&
      this.SubBoards[6].status !== boardStatus.RUNNING;
    const col2Condition: boolean =
      this.SubBoards[1].status === this.SubBoards[4].status &&
      this.SubBoards[4].status === this.SubBoards[7].status &&
      this.SubBoards[7].status !== boardStatus.DRAW &&
      this.SubBoards[7].status !== boardStatus.RUNNING;
    const col3Condition: boolean =
      this.SubBoards[2].status === this.SubBoards[5].status &&
      this.SubBoards[5].status === this.SubBoards[8].status &&
      this.SubBoards[8].status !== boardStatus.DRAW &&
      this.SubBoards[8].status !== boardStatus.RUNNING;
    const diag1Condition: boolean =
      this.SubBoards[0].status === this.SubBoards[4].status &&
      this.SubBoards[4].status === this.SubBoards[8].status &&
      this.SubBoards[8].status !== boardStatus.DRAW &&
      this.SubBoards[8].status !== boardStatus.RUNNING;
    const diag2Condition: boolean =
      this.SubBoards[2].status === this.SubBoards[4].status &&
      this.SubBoards[4].status === this.SubBoards[6].status &&
      this.SubBoards[6].status !== boardStatus.DRAW &&
      this.SubBoards[6].status !== boardStatus.RUNNING;

    if (row1Condition) {
      if (this.SubBoards[0].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (row2Condition) {
      if (this.SubBoards[4].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (row3Condition) {
      if (this.SubBoards[7].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (col1Condition) {
      if (this.SubBoards[0].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (col2Condition) {
      if (this.SubBoards[1].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (col3Condition) {
      if (this.SubBoards[2].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (diag1Condition) {
      if (this.SubBoards[0].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (diag2Condition) {
      if (this.SubBoards[2].status === boardStatus.WINX) {
        this.Conclusion = boardStatus.WINX;
      } else {
        this.Conclusion = boardStatus.WINO;
      }
    }
    if (this.Conclusion === 'RUNNING') {
      for (let i = 0; i < 9; i++) {
        if (this.SubBoards[i].status === 'RUNNING') {
          return;
        }
      }
    }
    this.Conclusion = boardStatus.DRAW;
  }

  public calculateGameResult(): GameResult {
    const activePlayers: XOPlayerState[] = [];
    const leftPlayers: XOPlayerState[] = [];
    for (const player of this.players) {
      if (!player.isLeftTheGame) {
        activePlayers.push(player);
      } else {
        leftPlayers.push(player);
      }
    }
    const playerResult = [];
    if (activePlayers.length == 2) {
      if (this.Conclusion === boardStatus.DRAW) {
        playerResult.push(
          new PlayerResult(
            activePlayers[0].playerId,
            0,
            1,
            ResultStatus.NOT_SCORED,
          ),
        );
        playerResult.push(
          new PlayerResult(
            activePlayers[1].playerId,
            0,
            1,
            ResultStatus.NOT_SCORED,
          ),
        );
      }
      if (this.Conclusion === boardStatus.WINX) {
        if (activePlayers[0].turn_symbol === 'X') {
          playerResult.push(
            new PlayerResult(activePlayers[0].playerId, 1, 1, ResultStatus.WON),
          );
          playerResult.push(
            new PlayerResult(
              activePlayers[1].playerId,
              -1,
              2,
              ResultStatus.LOST,
            ),
          );
        } else {
          playerResult.push(
            new PlayerResult(activePlayers[1].playerId, 1, 1, ResultStatus.WON),
          );
          playerResult.push(
            new PlayerResult(
              activePlayers[0].playerId,
              -1,
              2,
              ResultStatus.LOST,
            ),
          );
        }
      } else {
        if (activePlayers[0].turn_symbol === 'O') {
          playerResult.push(
            new PlayerResult(activePlayers[0].playerId, 1, 1, ResultStatus.WON),
          );
          playerResult.push(
            new PlayerResult(
              activePlayers[1].playerId,
              -1,
              2,
              ResultStatus.LOST,
            ),
          );
        } else {
          playerResult.push(
            new PlayerResult(activePlayers[1].playerId, 1, 1, ResultStatus.WON),
          );
          playerResult.push(
            new PlayerResult(
              activePlayers[0].playerId,
              -1,
              2,
              ResultStatus.LOST,
            ),
          );
        }
      }
    } else if (activePlayers.length === 1) {
      playerResult.push(
        new PlayerResult(activePlayers[0].playerId, 1, 1, ResultStatus.WON),
      );
      playerResult.push(
        new PlayerResult(
          leftPlayers[0].playerId,
          -1,
          2,
          ResultStatus.ABANDONED,
        ),
      );
    } else {
      playerResult.push(
        new PlayerResult(leftPlayers[1].playerId, 0, 1, ResultStatus.ABANDONED),
      );
      playerResult.push(
        new PlayerResult(leftPlayers[0].playerId, 0, 1, ResultStatus.ABANDONED),
      );
    }

    return new GameResult(playerResult);
  }

  public initPlayers(playerIds: number[]): XOPlayerState[] {
    if (playerIds.length !== 2) {
      throw new Error('Invalid number of ids');
    }
    const players: XOPlayerState[] = [];
    players.push(new XOPlayerState(playerIds[0], turn.X));
    players.push(new XOPlayerState(playerIds[1], turn.O));
    return players;
  }
  public updateTurn() {
    if(!this.LastTurn){
      return this.players[0].playerId
    }
    for (const player of this.players) {
      if (player.playerId!==this.LastTurn.playerId)
      {
           return player.playerId;
      }
    }
  }
  public handleMove(move: IMove): {
    has_error: boolean;
    error: string;
    playerId: number;
    updated_tables: XOSubBoard[];
    conclusion: boardStatus;
    move:IMove;
  } {
    const firstError: boolean = this.isPositionEmpty(move);
    const secondError: boolean = this.isValidSubBoard(move);
    let error: string = '';
    const no_error: boolean = firstError && secondError;
    if (!firstError) {
      error = 'The position is not empty';
    }
    if (!secondError) {
      error = 'Invalid SubBoard';
    }
    let this_playerId: number;
    if (no_error) {
      if (move.turn === turn.X) {
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].turn_symbol !== 'O') {
            this_playerId = this.players[i].playerId;
          }
        }
      }
    } else {
      if (move.turn === turn.O) {
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].turn_symbol !== 'X') {

            this_playerId = this.players[i].playerId;
          }
        }
      }
    }
    const x = move.xPos;
    const y = move.yPos;
    this.SubBoards[move.subBoard_id].table[x][y] = move.turn;
    this.checkSubBoardCondition(this.SubBoards[move.subBoard_id]);
    this.checkMainBoardCondition();
    this.LastTurn = { playerId: this_playerId, move: move };

    return {
      error: error,
      playerId: this.updateTurn(),
      has_error: !no_error,
      updated_tables: this.SubBoards,
      conclusion: this.Conclusion,
      move:move
    };
  }
}
