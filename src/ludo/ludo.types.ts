import { Exclude, Expose } from 'class-transformer';
import { PlayerState } from '../common/base/base-game-engine.state';

export enum boardStatus {
  DRAW = 'DRAW',
  WINX = 'X',
  WINO = 'O',
  RUNNING = 'RUNNING',
}

// export interface subBoard {
//   id: number;
//   status: boardStatus;
//   table: string[][];
// }

export enum turn {
  X = 'X',
  O = 'O',
}

export interface IMove {
  subBoard_id:number;
  xPos: number;
  yPos: number;
  turn: turn;
}

@Exclude()
export class XOPlayerState extends PlayerState {
  @Expose({ name: 'fault_count' })
  public faultCount: number;
  @Expose({ name: 'turn_symbol' })
  public turn_symbol: turn;

  constructor(
    playerId: number,
    turn_symbol: turn
  ) {
    super(playerId);
    this.faultCount = 0;
    this.turn_symbol = turn_symbol;
  }
}

@Exclude()
export class XOSubBoard {
  @Expose({ name: 'id' })
  public id: number;

  @Expose({ name: 'status' })
  public status: boardStatus;

  @Expose({ name: 'table' })
  public table: string[][];

  constructor(id: number, status:boardStatus) {
    this.status = status;
    const temp = new Array(3); // Create an array with 3 rows
    for (let i = 0; i < 3; i++) {
      temp[i] = new Array(3); // Create an array with 3 columns for each row
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        temp[i][j] = "Z";
      }
    }
    this.table = temp;
    this.id = id;
  }
}
export interface ILastTurn {
  playerId: number;
  move: IMove;
}








// export enum pieceStatus {
//   OUT = 'OUT',
//   PLAYING = 'PLAYING', // or ACTIVE ???
//   WON = 'WON',
// }
//
// export enum positionType {
//   MAIN_ROAD = 'MAIN_ROAD',
//   SIDE_ROAD = 'SIDE_ROAD',
// }
//
// export interface IPosition {
//   type: positionType;
//   index: number;
// }
//
// @Exclude()
// export class LudoPiece {
//   @Expose({ name: 'id' })
//   public id: number;
//
//   @Expose({ name: 'piece_status' })
//   public pieceStatus: pieceStatus;
//
//   @Expose({ name: 'position' })
//   public position: IPosition;
//
//   constructor(id: number, pieceStatus: pieceStatus, position: IPosition) {
//     this.pieceStatus = pieceStatus;
//     this.position = position;
//     this.id = id;
//   }
// }
//
// @Exclude()
// export class LudoPlayerState extends PlayerState {
//   @Expose({ name: 'start_point' })
//   public startPoint: number;
//
//   @Expose({ name: 'end_point' })
//   public endPoint: number;
//
//   @Expose({ name: 'pieces' })
//   @Type(() => LudoPiece)
//   public pieces: LudoPiece[];
//
//   @Expose({ name: 'fault_count' })
//   public faultCount: number;
//
//   public consecutiveNonSixRolls: number;
//
//   constructor(
//     playerId: number,
//     startPoint: number,
//     endPoint: number,
//     pieces: LudoPiece[],
//   ) {
//     super(playerId);
//     this.startPoint = startPoint;
//     this.endPoint = endPoint;
//     this.faultCount = 0;
//     this.consecutiveNonSixRolls = 0;
//     this.pieces = pieces;
//   }
// }
//
// // export interface ILastTurn {
// //   step: 'ROLL_DICE' | 'MOVE_PIECE';
// //   playerId: number;
// //   turnCount: number;
// //   diceValue: number;
// //   options: IMoveOption[];
// // }
//
// export interface IMoveOption extends IMove {
//   pieceId: number;
// }
//
// export interface IMove {
//   beforeMove: {
//     pieceStatus: pieceStatus;
//     position: IPosition;
//   };
//   afterMove: {
//     pieceStatus: pieceStatus;
//     position: IPosition;
//   };
// }
//
// export type CheatType = 'move_main' | 'move_side' | 'roll_dice';
//
// export interface ParsedCheat {
//   type: CheatType;
//   values: number[];
// }
