import 'reflect-metadata';
import { LudoState } from '../ludo.state';

describe('LudoState', () => {
  let ludoState: LudoState;

  beforeEach(() => {
    ludoState = new LudoState('match-1', [1, 2, 3, 4]);
  });

  describe('calculateWalkedSteps', () => {
    it('should calculate walked steps when currentPoint >= startPoint', () => {
      const startPoint = 0;
      const currentPoint = 10;
      const boardSize = 52;

      const result = (ludoState as any).calculateWalkedSteps(startPoint, currentPoint, boardSize);
      expect(result).toBe(10);
    });

    it('should calculate walked steps when currentPoint < startPoint', () => {
      const startPoint = 13;
      const currentPoint = 0;
      const boardSize = 52;

      const result = (ludoState as any).calculateWalkedSteps(startPoint, currentPoint, boardSize);
      expect(result).toBe(39);
    });

    it('should calculate walked steps when currentPoint and startPoint are the same', () => {
      const startPoint = 10;
      const currentPoint = 10;
      const boardSize = 52;

      const result = (ludoState as any).calculateWalkedSteps(startPoint, currentPoint, boardSize);
      expect(result).toBe(0);
    })

  });

  describe('calculateNewPositionPlayingPieceInMainRoad', () => {
    it('should return the new position on the main road', () => {
      const start = 0;
      const currentPosition = 0;
      const steps = 4;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'MAIN_ROAD', index: 4 },
        status: 'PLAYING',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 0;
      const currentPosition = 4;
      const steps = 4;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'MAIN_ROAD', index: 8 },
        status: 'PLAYING',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 0;
      const currentPosition = 48;
      const steps = 4;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'SIDE_ROAD', index: 1 },
        status: 'PLAYING',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 13;
      const currentPosition = 51;
      const steps = 4;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'MAIN_ROAD', index: 3 },
        status: 'PLAYING',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 13;
      const currentPosition = 8;
      const steps = 6;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'SIDE_ROAD', index: 2 },
        status: 'PLAYING',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 0;
      const currentPosition = 50;
      const steps = 6;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: null,
        status: 'WON',
      });
    });

    it('should return the new position on the main road', () => {
      const start = 0;
      const currentPosition = 49;
      const steps = 6;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInMainRoad(start, currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'SIDE_ROAD', index: 4 },
        status: 'PLAYING',
      });
    });
  });
  
  describe('calculateNewPositionPlayingPieceInSideRoad', () => {
    it('should return the new position on the side road', () => {
      const currentPosition = 2;
      const steps = 2;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInSideRoad(currentPosition, steps);
      expect(result).toEqual({
        position: null,
        status: 'WON',
      });
    });

    it('should return the new position on the side road', () => {
      const currentPosition = 0;
      const steps = 2;

      const result = (ludoState as any).calculateNewPositionPlayingPieceInSideRoad(currentPosition, steps);
      expect(result).toEqual({
        position: { type: 'SIDE_ROAD', index: 2 },
        status: 'PLAYING',
      });
    });
  });

});