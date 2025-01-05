import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { LudoService } from '../ludo.service';
import { LudoState } from '../ludo.state';
import { CHEAT_ACTION, ROLL_DICE_ACTION, SELECT_PIECE_ACTION } from '../ludo.action';
import { pieceStatus, positionType } from '../ludo.types';
import { PlayerActionCommandPRCPayload } from '@PeleyGame/game-engine-sdk';

describe('LudoService', () => {
  let service: LudoService;
  let clientProxyMock: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    clientProxyMock = {
      emit: jest.fn(),
      send: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LudoService,
        {
          provide: 'GAME_ENGINE_SERVICE',
          useValue: clientProxyMock,
        },
      ],
    }).compile();

    service = module.get<LudoService>(LudoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initSetupTheGameState', () => {
    it('should initialize game state correctly', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      expect(state).toBeInstanceOf(LudoState);
      expect(state.id).toBe(matchId);
      expect(state.players.length).toBe(playerIds.length);
    });
  });

  describe('startGame', () => {
    it('should start the game', async () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      await service.startGame(matchId, state);
      expect(state.LastTurn.playerId).toBeDefined();
    });
  });

  describe('processUserAction', () => {
    let state: LudoState;
    const matchId = 'test-match';
    const playerIds = [1, 2, 3, 4];

    beforeEach(() => {
      state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn = {
        playerId: playerIds[0]
      }
      service.games.set(matchId, state);
    });

    it('should process ROLL_DICE_ACTION correctly', async () => {
      const cmd: PlayerActionCommandPRCPayload<any> = {
        matchId,
        playerId: playerIds[0],
        actionName: ROLL_DICE_ACTION,
        data: {},
      };

      await service.processUserAction(cmd);
      expect(state.LastTurn.diceValue).toBeDefined();
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    // TODO complete this flow
    it('should process SELECT_PIECE_ACTION correctly', async () => {
      // First, roll a dice
      await service.processUserAction({
        matchId,
        playerId: playerIds[0],
        actionName: ROLL_DICE_ACTION,
        data: {},
      });

      const cmd: PlayerActionCommandPRCPayload<any> = {
        matchId,
        playerId: playerIds[0],
        actionName: SELECT_PIECE_ACTION,
        data: { piece_id: 1 },
      };

      await service.processUserAction(cmd);
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should process CHEAT_ACTION correctly', async () => {
      const cmd: PlayerActionCommandPRCPayload<any> = {
        matchId,
        playerId: playerIds[0],
        actionName: CHEAT_ACTION,
        data: { code: 'move_main_1_10' },
      };

      await service.processUserAction(cmd);
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid matchId', async () => {
      const cmd: PlayerActionCommandPRCPayload<any> = {
        matchId: 'invalid-match',
        playerId: playerIds[0],
        actionName: ROLL_DICE_ACTION,
        data: {},
      };

      await expect(service.processUserAction(cmd)).rejects.toThrow('game is not found');
    });
  });

  describe('rollDice', () => {
    it('should roll dice and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];

      service['rollDice'](playerIds[0], state);

      expect(state.LastTurn.diceValue).toBeDefined();
      expect(state.LastTurn.options).toBeDefined();
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should throw error if it is not player\'s turn', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];

      expect(() => service['rollDice'](playerIds[1], state)).toThrow('It is not your turn');
    });
  });

  describe('movePiece', () => {
    it('should move piece and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];
      state.LastTurn.diceValue = 6;
      state.LastTurn.options = [{
        pieceId: 1,
        beforeMove: { pieceStatus: pieceStatus.OUT, position: null },
        afterMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 0 } }
      }];

      service['movePiece'](playerIds[0], 1, state);

      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should move piece and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2];

      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[1];
      state.LastTurn.diceValue = 6;

      console.log(state.players[1].pieces);

      // set pieces position
      state.players[1].pieces[0] = {
        ...state.players[1].pieces[0],
        pieceStatus: pieceStatus.PLAYING,
        position: { type: positionType.MAIN_ROAD, index: 21 }
      }


      state.LastTurn.options = [{
        pieceId: 1,
        beforeMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 21 } },
        afterMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.SIDE_ROAD, index: 2 } }
      }]

      service['movePiece'](playerIds[1], 1, state);

      expect(state.players[1].pieces[0]).toEqual({
        pieceStatus: pieceStatus.PLAYING,
        position: { type: positionType.SIDE_ROAD, index: 2 },
        id: 1
      });
      console.log(state.players[1].pieces);
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should move piece and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2];

      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];
      state.LastTurn.diceValue = 6;
      state.LastTurn.options = [{
        pieceId: 1,
        beforeMove: { pieceStatus: pieceStatus.OUT, position: null },
        afterMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 0 } }
      }];

      service['movePiece'](playerIds[0], 1, state);

      expect(state.players[0].pieces[0]).toEqual({
        pieceStatus: 'PLAYING',
        position: { index: 0, type: 'MAIN_ROAD' },
        id: 1
      });
      expect(clientProxyMock.emit).toHaveBeenCalled();
    })

    it('should throw error if it is not player\'s turn', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];

      expect(() => service['movePiece'](playerIds[1], 1, state)).toThrow('It is not your turn');
    });
  });

  describe('cheatAction', () => {
    it('should apply cheat action and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];

      service['cheatAction'](playerIds[0], 'move_main_1_10', state);
      expect(state.players[0].pieces[0]).toEqual({
        pieceStatus: 'PLAYING',
        position: { index: 10, type: 'MAIN_ROAD' },
        id: 1
      });
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

    it('should apply cheat action and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      state.LastTurn.playerId = playerIds[0];

      service['cheatAction'](playerIds[0], 'move_main_1_0', state);
      expect(state.players[0].pieces[0]).toEqual({
        pieceStatus: 'PLAYING',
        position: { index: 0, type: 'MAIN_ROAD' },
        id: 1
      });
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });
  });

  describe('Capturing', () => {
    it('should capture opponent pieces and update state', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      // set opponent pieces position
      state.players[1].pieces[0] = {
        ...state.players[1].pieces[0],
        pieceStatus: pieceStatus.PLAYING,
        position: { index: 10, type: positionType.MAIN_ROAD }
      }

      // set pieces position
      state.players[0].pieces[0] = {
        ...state.players[0].pieces[0],
        pieceStatus: pieceStatus.PLAYING,
        position: { type: positionType.MAIN_ROAD, index: 9 }
      }

      // set last turn and its options
      state.LastTurn.playerId = playerIds[0];
      state.LastTurn.diceValue = 1;
      state.LastTurn.options = [{
        pieceId: 1,
        beforeMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 9 } },
        afterMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 10 } }
      }];

      service['movePiece'](playerIds[0], 1, state);
      expect(state.players[0].pieces[0]).toEqual({
        pieceStatus: pieceStatus.PLAYING,
        position: { index: 10, type: positionType.MAIN_ROAD },
        id: 1
      });
      expect(state.players[1].pieces[0]).toEqual({
        pieceStatus: pieceStatus.OUT,
        position: null,
        id: 1
      });
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

  });

  describe('Blocking', () => {
    it('should block the move if the position is occupied by the same player', () => {
      const matchId = 'test-match';
      const playerIds = [1, 2, 3, 4];
      const state = service.initSetupTheGameState(matchId, playerIds);
      // set opponent pieces position
      state.players[0].pieces[0] = {
        ...state.players[0].pieces[0],
        pieceStatus: pieceStatus.PLAYING,
        position: { index: 10, type: positionType.MAIN_ROAD }
      }

      // set pieces position
      state.players[0].pieces[1] = {
        ...state.players[0].pieces[1],
        pieceStatus: pieceStatus.PLAYING,
        position: { index: 9, type: positionType.MAIN_ROAD }
      }

      // set last turn and its options
      state.LastTurn.playerId = state.players[0].playerId;
      state.LastTurn.diceValue = 1;

      service['rollDice'](state.players[0].playerId, state, 1);
      expect(state.LastTurn.options.length).toBe(1);
      expect(state.LastTurn.options[0]).toEqual({
        pieceId: 1,
        current: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 10 } },
        afterMove: { pieceStatus: pieceStatus.PLAYING, position: { type: positionType.MAIN_ROAD, index: 11 } }
      });
      expect(clientProxyMock.emit).toHaveBeenCalled();
    });

  });
});