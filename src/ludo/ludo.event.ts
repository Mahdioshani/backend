import { Exclude, Expose } from "class-transformer";
import { ILastTurn, IMove, IMoveOption, LudoPlayerState } from "./ludo.types";

export const TUNE_UPDATED_EVENT = 'ludo.tune_updated';
export const PIECE_MOVED_EVENT = 'ludo.piece_moved';
export const ROLLED_DICE_EVENT = 'ludo.rolled_dice';
export const PIECE_CAPTURED_EVENT = 'ludo.piece_captured';
export const TURN_TIMED_OUT = 'ludo.turn_timed_out';


@Exclude()
export class ReconnectEvent {
  @Expose({ name: 'id' })
  public id: string;

  @Expose({ name: 'dice' })
  public LastTurn: Partial<ILastTurn>;

  @Expose({ name: 'players' })
  public players: LudoPlayerState[];

  @Expose({ name: 'remaining_time' })
  public remainingTime: number;

  @Expose({ name: 'state_version' })
  public stateVersion: number;

  constructor(data: ReconnectEvent) {
    Object.assign(this, data);
  }
}

export class LudoRolledDiceEvent {
  @Expose({ name: 'dice' })
  public diceValue: number;

  @Expose({ name: 'player_id' })
  public playerId: number;

  @Expose({ name: 'options' })
  public options: IMoveOption[];

  @Expose({ name: 'continuous_six_dice_count' })
  public continuousSixDiceCount: number;

  constructor(data: LudoRolledDiceEvent) {
    Object.assign(this, data);
  }
}

export class LudoPieceMovedEvent {
  @Expose({ name: 'player_id' })
  public playerId: number;

  @Expose({ name: 'move' })
  public move: IMove;

  @Expose({ name: 'piece_id' })
  public pieceId: number;

  constructor(data: LudoPieceMovedEvent) {
    Object.assign(this, data);
  }
}

export class LudoPieceCapturedEvent {
  @Expose({ name: 'player_id' })
  public playerId: number;

  @Expose({ name: 'move' })
  public move: IMove;

  @Expose({ name: 'piece_id' })
  public pieceId: number;

  constructor(data: LudoPieceMovedEvent) {
    Object.assign(this, data);
  }
}

export class LudoTuneUpdatedEvent {
  @Expose({ name: 'current_turn_player' })
  currentTurnPlayer: LudoPlayerState;

  constructor(player: LudoPlayerState) {
    this.currentTurnPlayer = player;
  }
}