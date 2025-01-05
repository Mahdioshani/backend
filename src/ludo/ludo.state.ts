import { Exclude, Expose } from "class-transformer";
import { GameEngineState } from "../common/base/base-game-engine.state";
import { IPosition, LudoPiece, LudoPlayerState, IMoveOption, pieceStatus, positionType, ILastTurn, IMove } from "./ludo.types";

import * as Chance from 'chance';
import { Logger } from "@nestjs/common";
import { GameResult, PlayerResult, ResultStatus } from "@PeleyGame/game-engine-sdk";

export const staticData = [
  {
    startPoint: 0,
    endPoint: 50,
  },
  {
    startPoint: 13,
    endPoint: 11,
  },
  {
    startPoint: 26,
    endPoint: 24,
  },
  {
    startPoint: 39,
    endPoint: 37,
  }
]

export const safeZone = [0, 8, 13, 21, 26, 34, 39, 47];

@Exclude()
export class LudoState extends GameEngineState<LudoPlayerState> {
  private readonly logger = new Logger(LudoState.name);
  private readonly chance = new Chance();

  @Expose({ name: 'last_turn' })
  public LastTurn: Partial<ILastTurn>;

  private continuousSixDiceCount = 0;

  constructor(matchId: string, playerIds: number[]) {
    super(matchId, playerIds);
    this.LastTurn = {};
  }

  private isPositionBlocked(position: IPosition, playerState: LudoPlayerState): boolean {
    // Check if the position is occupied by another piece of the same player
    const occupyingPiece = playerState.pieces.find(piece =>
      piece?.position?.type === position?.type && piece?.position?.index === position?.index
    );
    if (occupyingPiece) {
      if (position.type === positionType.MAIN_ROAD && safeZone.includes(position.index)) {
        return false;
      }

      return true;
    }
    return false;
  }

  private calculateWalkedSteps(startPoint: number, currentPoint: number, boardSize: number) {
    if (currentPoint >= startPoint) {
      return currentPoint - startPoint
    }
    else {
      return (boardSize - startPoint) + currentPoint
    }
  }

  private calculateNewPositionPlayingPieceInMainRoad(start: number, currentPosition: number, steps: number): { position: IPosition, status: pieceStatus } {
    const mainRoadSteps = 50;
    const boardSize = 52;

    // Calculate the effective position of the current player on a normalized board
    const walked = this.calculateWalkedSteps(start, currentPosition, boardSize);
    // const walked = ((currentPosition - start + mainRoadSteps) % mainRoadSteps) + 1;
    // Calculate the new position based on the steps 
    const calNewWalked = (walked + steps);

    if (calNewWalked > mainRoadSteps) {
      const remainingMove = calNewWalked - mainRoadSteps;
      if (remainingMove === 6) {
        return {
          position: null,
          status: pieceStatus.WON
        };
      } else {
        return {
          position: {
            type: positionType.SIDE_ROAD,
            index: remainingMove - 1
          },
          status: pieceStatus.PLAYING
        }
      }
    } else {
      const actualNewPosition = (currentPosition + steps) % boardSize;
      return {
        position: {
          type: positionType.MAIN_ROAD,
          index: actualNewPosition
        },
        status: pieceStatus.PLAYING
      }
    }
  }

  private calculateNewPositionPlayingPieceInSideRoad(currentPosition: number, steps: number): { position: IPosition, status: pieceStatus } {
    const calcNewPosition = currentPosition + steps;
    if (calcNewPosition === 5) {
      return {
        position: null,
        status: pieceStatus.WON
      }
    } else if (calcNewPosition < 5) {
      return {
        position: {
          type: positionType.SIDE_ROAD,
          index: calcNewPosition,
        },
        status: pieceStatus.PLAYING
      }
    } else {
      return null;
    }
  }

  private calculateMoveOption(piece: LudoPiece, diceValue: number, playerState: LudoPlayerState): IMoveOption | null {
    const current = {
      pieceStatus: piece.pieceStatus,
      position: { ...piece.position },
    };

    let afterMove: { pieceStatus: pieceStatus; position: IPosition };

    switch (current.pieceStatus) {
      case pieceStatus.OUT:
        if (diceValue === 6) {
          afterMove = {
            pieceStatus: pieceStatus.PLAYING,
            position: { type: positionType.MAIN_ROAD, index: playerState.startPoint },
          };
        } else {
          return null;
        }
        break;

      case pieceStatus.PLAYING:
        if (current.position.type === positionType.MAIN_ROAD) {
          const newPosition = this.calculateNewPositionPlayingPieceInMainRoad(playerState.startPoint, current.position.index, diceValue)
          afterMove = {
            pieceStatus: newPosition.status,
            position: newPosition.position
          };
        } else {
          const newPosition = this.calculateNewPositionPlayingPieceInSideRoad(current.position.index, diceValue)
          if (!newPosition) {
            return null;
          }
          afterMove = {
            pieceStatus: newPosition.status,
            position: newPosition.position
          };
        }
        break;

      case pieceStatus.WON:
        return null; // Can't move if already won
    }

    if (afterMove.position && this.isPositionBlocked(afterMove.position, playerState)) {
      return null;
    }

    return {
      pieceId: piece.id,
      beforeMove: current,
      afterMove,
    };
  }


  private resultPoint(status: ResultStatus) {
    const playersCount = this.players.length;

    if (status !== ResultStatus.WON) {
      return 0.25;
    }
    switch (playersCount) {
      case 2:
        return 1;
      case 3:
        return 2;
      case 4:
        return 3;
      default:
        return 0;
    }
  }

  public calculateGameResult(): GameResult {
    let position = 0;

    const activePlayers: LudoPlayerState[] = [];
    const leftPlayers: LudoPlayerState[] = [];
    for (const player of this.players) {
      if (!player.isLeftTheGame) {
        activePlayers.push(player);
      } else {
        leftPlayers.push(player);
      }
    }

    const sortedActivePlayers = activePlayers.sort(
      (a, b) => {
        const value1 = b.pieces.filter(piece => piece.pieceStatus === pieceStatus.WON).length;
        const value2 = a.pieces.filter(piece => piece.pieceStatus === pieceStatus.WON).length
        return value1 - value2;
      }
    );

    const playerResult = [];
    for (const player of sortedActivePlayers) {
      position += 1;
      const status = player.playerId === sortedActivePlayers[0].playerId ? ResultStatus.WON : ResultStatus.LOST;
      const point = this.resultPoint(status);
      playerResult.push(
        new PlayerResult(
          player.playerId,
          point,
          position,
          status
        ),
      );
    }

    for (const player of leftPlayers) {
      position += 1;
      const point = this.resultPoint(ResultStatus.LEFT);
      playerResult.push(
        new PlayerResult(player.playerId, point, position, ResultStatus.LEFT),
      );
    }

    return new GameResult(playerResult);
  }

  public getPiecesOfPosition(position: IPosition): { playerId: number, pieceId: number }[] {
    const result: { playerId: number, pieceId: number }[] = this.players.reduce((acc, player) => {
      const pieces = player.pieces.filter(piece => {
        if (piece.position?.type === position.type && piece.position?.index === position.index) {
          return true;
        }
        return false;
      })
      if (pieces.length > 0) {
        acc.push(...pieces.map(piece => ({ playerId: player.playerId, pieceId: piece.id })))
      }
      return acc;
    }, [])
    return result;
  }

  public checkWon(playerId: number): boolean {
    const player = this.players.find(player => player.playerId === playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    return player.pieces.every(piece => piece.pieceStatus === pieceStatus.WON);
  }

  public getPieceOfPlayer(playerId: number, pieceId: number): LudoPiece {
    const player = this.players.find(player => player.playerId === playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    const piece = player.pieces.find(p => p.id === pieceId);
    if (!piece) {
      throw new Error(`Piece with ID ${pieceId} not found`);
    }
    return piece;
  }

  public initPlayers(playerIds: number[]): LudoPlayerState[] {
    let _staticData = staticData;
    if (playerIds.length === 2) {
      _staticData = [staticData[0], staticData[2]];
    }
    const result = playerIds.reverse().map((playerId, playerIndex) => {

      const { endPoint, startPoint } = _staticData[playerIndex];
      // create pieces
      const _pieces = [1, 2, 3, 4].map((pieceIndex: number) => {
        return new LudoPiece(pieceIndex, pieceStatus.OUT, null)
      });
      return new LudoPlayerState(
        playerId,
        startPoint,
        endPoint,
        _pieces
      );
    });
    return result;
  }

  private findNextPlayerIndex(currentPlayerIndex: number): number {
    let nextPlayerIndex = currentPlayerIndex;
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
      if (!this.players[nextPlayerIndex].isLeftTheGame) {
        return nextPlayerIndex;
      }
    } while (nextPlayerIndex !== currentPlayerIndex);

    return -1;
  }

  public updateTurn(hasPrize?: boolean) {
    this.LastTurn.turnCount = this.LastTurn.turnCount ? this.LastTurn.turnCount + 1 : 1;
    this.LastTurn.step = "ROLL_DICE";
    if (!this?.LastTurn?.playerId) {
      const indexRandomUser = Math.floor(Math.random() * this.players.length);
      this.LastTurn.playerId = this.players[indexRandomUser].playerId;
    }
    if (this.LastTurn.diceValue === 6 && this.continuousSixDiceCount >= 3) {
      this.continuousSixDiceCount = 0;
    }
    else if (this.LastTurn.diceValue === 6) {
      return this.LastTurn.playerId;
    }
    if (hasPrize) {
      return this.LastTurn.playerId;
    }

    const currentPlayerIndex = this.players.findIndex(player => player.playerId === this.LastTurn.playerId);
    const nextPlayerIndex = this.findNextPlayerIndex(currentPlayerIndex);
    // const nextPlayerIndex = (
    //   this.players.length +
    //   this.players.findIndex(player => player.playerId === this.LastTurn.playerId) + 1)
    //   % this.players.length;
    const nextPlayerId = this.players[nextPlayerIndex].playerId;
    this.LastTurn.playerId = nextPlayerId;
    return nextPlayerId;

  }

  public rollDice(playerId: number, diceValue?: number) {

    const player = this.players.find(player => player.playerId === playerId);
    let _diceValue = diceValue;

    if (!_diceValue && player.pieces.every(piece => piece.pieceStatus === pieceStatus.OUT)) {
      console.log("NEW ROLL");
      const baseProbability = 1 / 6; // Standard dice probability
      const maxProbabilityBoost = 0.5; // Maximum probability boost
      const probabilityIncreaseRate = 0.05; // Probability increase per non-6 roll

      // Calculate boosted probability
      const probabilityBoost = Math.min(
        maxProbabilityBoost,
        player.consecutiveNonSixRolls * probabilityIncreaseRate
      );

      const adjustedProbability = baseProbability + probabilityBoost;

      _diceValue = this.chance.floating({
        min: 0,
        max: 1
      }) < adjustedProbability ? 6 : this.chance.d6();
    } else if (!_diceValue) {
      console.log("OLD ROLL");
      _diceValue = this.chance.d6();
    }

    if (_diceValue === 6 && this.continuousSixDiceCount + 1 >= 3) {
      this.continuousSixDiceCount += 1;
      player.consecutiveNonSixRolls = 0;
      this.LastTurn.diceValue = 6;
      this.LastTurn.options = [];
      this.LastTurn.playerId = playerId;
      return {
        diceValue: _diceValue,
        playerId,
        options: [],
        continuousSixDiceCount: 3
      };

    }

    if (_diceValue === 6) {
      player.consecutiveNonSixRolls = 0;
      this.continuousSixDiceCount += 1;
    } else {
      player.consecutiveNonSixRolls += 1;
      this.continuousSixDiceCount = 0;
    }

    const options: IMoveOption[] = [];
    const playerState = this.players.find(player => player.playerId === playerId);

    playerState.pieces.forEach((piece) => {
      const moveOption = this.calculateMoveOption(piece, _diceValue, playerState);
      if (moveOption) {
        options.push(moveOption);
      }
    });
    this.LastTurn.diceValue = _diceValue;
    this.LastTurn.options = options;
    if (options.length) {
      this.LastTurn.step = "MOVE_PIECE";
    }
    return {
      diceValue: _diceValue,
      playerId,
      options,
      continuousSixDiceCount: this.continuousSixDiceCount
    };
  }

  public movePiece(playerId: number, pieceId: number): {
    playerId: number,
    pieceId: number,
    move: IMove
  } {
    if (!this.LastTurn.diceValue) {
      throw new Error('Dice must be rolled before moving a piece');
    }
    const playerState = this.players.find((player) => player.playerId === playerId);
    if (!playerState) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    const moveOption = this.LastTurn.options.find(option => option.pieceId === pieceId);
    if (!moveOption) {
      throw new Error(`Invalid move for piece ${pieceId}`);
    }

    const piece = playerState.pieces.find(p => p.id === pieceId);
    if (!piece) {
      throw new Error(`Piece with ID ${pieceId} not found`);
    }

    // Update the piece's status and position
    piece.pieceStatus = moveOption.afterMove.pieceStatus;
    piece.position = moveOption.afterMove.position;
    const move: IMove = {
      afterMove: moveOption.afterMove,
      beforeMove: moveOption.beforeMove,
    }
    // TODO set interface for result 
    return {
      playerId,
      pieceId,
      move
    }
  }

  public resetAllPlayerPiece(playerId: number) {
    const player = this.players.find(player => player.playerId === playerId);
    if (!player) {
      this.logger.error("player not found in this match")
      return;
    }
    // update all piece
    player.pieces.forEach(piece => {
      piece.pieceStatus = pieceStatus.OUT;
      piece.position = null;
    })

    return player
  }

  public movePieceTo(playerId: number, pieceId: number, pieceStatus: pieceStatus, piecePosition: IPosition): {
    playerId: number,
    pieceId: number,
    move: IMove
  } {
    const playerState = this.players.find((player) => player.playerId === playerId);
    if (!playerState) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    const piece = playerState.pieces.find(p => p.id === pieceId);
    if (!piece) {
      throw new Error(`Piece with ID ${pieceId} not found`);
    }
    if (piecePosition?.type === positionType?.MAIN_ROAD && piecePosition.index > 51) {
      throw new Error(`move is not valid`);
    }
    if (piecePosition?.type === positionType?.SIDE_ROAD && piecePosition.index > 5) {
      throw new Error(`move is not valid`);
    }
    const move: IMove = {
      afterMove: {
        pieceStatus: pieceStatus,
        position: piecePosition,
      },
      beforeMove: {
        pieceStatus: piece.pieceStatus,
        position: piece.position
      }
    }

    piece.pieceStatus = pieceStatus;
    piece.position = piecePosition;
    // TODO set interface for result 
    return {
      playerId,
      pieceId,
      move
    }
  }
}