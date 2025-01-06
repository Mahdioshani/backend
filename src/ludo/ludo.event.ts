import { Exclude, Expose } from "class-transformer";
import {XOPlayerState } from "./ludo.types";

export const TUNE_UPDATED_EVENT = 'XO.tune_updated';
export const TURN_TIMED_OUT = 'XO.turn_timed_out';


@Exclude()
export class ReconnectEvent {
  @Expose({ name: 'id' })
  public id: string;
  
  @Expose({ name: 'players' })
  public players: XOPlayerState[];

  @Expose({ name: 'remaining_time' })
  public remainingTime: number;

  @Expose({ name: 'state_version' })
  public stateVersion: number;

  constructor(data: ReconnectEvent) {
    Object.assign(this, data);
  }
}

export class XOTuneUpdatedEvent {
  @Expose({ name: 'current_turn_player' })
  currentTurnPlayer: XOPlayerState;

  constructor(player: XOPlayerState) {
    this.currentTurnPlayer = player;
  }
}