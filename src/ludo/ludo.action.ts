import { Expose } from "class-transformer";

export const ROLL_DICE_ACTION = 'ludo.roll_dice';

export const SELECT_PIECE_ACTION = 'ludo.select_piece';
export const CHEAT_ACTION = 'ludo.cheat';

export class LudoPlayerSelectPieceAction {
  @Expose({ name: "piece_id" })
  public piece_id: number;

  constructor(piece_id: number) {
      this.piece_id = piece_id;
  }
}

export class LudoCheatAction {
  public code: string;

  constructor(code: string) {
    this.code = code;
  }
}