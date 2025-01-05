import { Exclude, Expose, Type } from "class-transformer";
import { PlayerState } from "../common/base/base-game-engine.state";


export enum pieceStatus {
  OUT = "OUT",
  PLAYING = "PLAYING", // or ACTIVE ???
  WON = "WON", 
}

export enum positionType {
  MAIN_ROAD = "MAIN_ROAD",
  SIDE_ROAD = "SIDE_ROAD"
}


export interface IPosition {
  type: positionType,
  index: number, 
}


@Exclude()
export class LudoPiece {
  @Expose({ name: 'id' })
  public id: number;

  @Expose({ name: 'piece_status' })
  public pieceStatus: pieceStatus;
  
  @Expose({ name: 'position'})
  public position: IPosition

  constructor(id: number, pieceStatus: pieceStatus, position: IPosition) {
    this.pieceStatus = pieceStatus;
    this.position = position;
    this.id = id;
  }

}

@Exclude()
export class LudoPlayerState extends PlayerState {
  @Expose({ name: 'start_point' })
  public startPoint: number;

  @Expose({ name: 'end_point' })
  public endPoint: number;

  @Expose({ name: 'pieces' })
  @Type(()=> LudoPiece)
  public pieces: LudoPiece[]

  @Expose({ name: 'fault_count' })
  public faultCount: number;

  public consecutiveNonSixRolls: number;
  
  constructor(playerId: number, startPoint: number, endPoint: number, pieces: LudoPiece[]) {
    super(playerId);
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.faultCount = 0;
    this.consecutiveNonSixRolls = 0;
    this.pieces = pieces;
  }
}

export interface ILastTurn {
  step: "ROLL_DICE" | "MOVE_PIECE";
  playerId: number;
  turnCount: number;
  diceValue: number;
  options: IMoveOption[];
}

export interface IMoveOption extends IMove {
  pieceId: number;
}

export interface IMove {
  beforeMove: {
    pieceStatus: pieceStatus;
    position: IPosition;
  };
  afterMove: {
    pieceStatus: pieceStatus;
    position: IPosition;
  };
}

export type CheatType = 'move_main' | 'move_side' | 'roll_dice';

export interface ParsedCheat {
  type: CheatType;
  values: number[];
}
