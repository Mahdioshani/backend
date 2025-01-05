
import { GameResult } from '@PeleyGame/game-engine-sdk';
import { Exclude, Expose } from 'class-transformer';

export class PlayerState {
  @Expose({ name: 'player_id' })
  public playerId: number;

  @Expose({ name: 'is_left_the_game' })
  public isLeftTheGame: boolean;

  public isConnect: boolean;

  constructor(playerId: number) {
    this.playerId = playerId;
    this.isLeftTheGame = false;
    this.isConnect = true;
  }
}

@Exclude()
export abstract class GameEngineState<PD extends PlayerState = PlayerState> {

  @Expose({ name: 'match_id' })
  public id: string;

  @Expose({ name: 'state_version' })
  public stateVersion: number;

  @Expose({ name: 'players' })
  public players: PD[];

  constructor(matchId: string, playerIds: number[]) {
    this.id = matchId;
    this.stateVersion = 1;

    this.players = this.initPlayers(playerIds);
  }

  abstract calculateGameResult(): GameResult;

  abstract initPlayers(playerIds: number[]): PD[];

  public applyUserReconnectEvent(playerId: number): boolean {
    const player: PlayerState = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      return false;
    }

    player.isConnect = true;
    this.stateVersion += 1;
    return true;
  }

  public applyUserDisconnectEvent(playerId: number): boolean {
    const player: PlayerState = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      return false;
    }

    player.isConnect = false;
    this.stateVersion += 1;
    return true;
  }

  public applyUserLeftEvent(playerId: number): boolean {
    const player: PlayerState = this.players.find((p) => p.playerId === playerId);
    if (!player) {
      return false;
    }

    player.isLeftTheGame = true;
    this.stateVersion += 1;
    return true;
  }

  public getActivePlayers(): PlayerState[] {
    return this.players.filter((p) => !p.isLeftTheGame);
  }

  public getStateVersion() {
    return this.stateVersion;
  }
}