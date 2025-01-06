import { Controller } from '@nestjs/common';
import {
  GameType,
  GameSetupCommandPRCPayload,
  GameSetupCommandPRCResponse,
  PlayerActionCommandPRCPayload,
  PlayerActionCommandPRCResponse,
  PlayerDisconnectCommandPRCPayload,
  PlayerDisconnectCommandPRCResponse,
  PlayerLeftCommandPRCPayload,
  PlayerLeftCommandPRCResponse,
  PlayerReconnectCommandPRCPayload,
  PlayerReconnectCommandPRCResponse
} from '@PeleyGame/game-engine-sdk';
import { receiveCommandTopic } from '@PeleyGame/game-engine-sdk';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { CustomRpcException } from '@app/common/exceptions/custom-rpc.exception';
import { GameEngineCommandType } from '@PeleyGame/game-engine-sdk';


import { XOService } from './ludo.service';

@Controller('ludo')
export class LudoController {
  constructor(private readonly ludoService: XOService) { }

  @MessagePattern(
    receiveCommandTopic(GameType.Ludo, GameEngineCommandType.SETUP),
    Transport.NATS
  )
  async setupGameHandler(@Payload() payload: GameSetupCommandPRCPayload): Promise<GameSetupCommandPRCResponse> {
    try {
      console.log("setup");
      return this.ludoService.baseSetupGame(payload);
    } catch (error) {
      throw new CustomRpcException(error);
    }
  }

  @MessagePattern(
    receiveCommandTopic(GameType.Ludo, GameEngineCommandType.PLAYER_ACTION),
    Transport.NATS
  )
  async userActionHandler(@Payload() payload: PlayerActionCommandPRCPayload<any>): Promise<PlayerActionCommandPRCResponse> {
    try {
      return this.ludoService.processUserAction(payload);
    } catch (error) {
      throw new CustomRpcException(error);
    }
  }

  @MessagePattern(
    receiveCommandTopic(GameType.Ludo, GameEngineCommandType.RECONNECT),
    Transport.NATS
  )
  async reconnectHandler(@Payload() payload: PlayerReconnectCommandPRCPayload): Promise<PlayerReconnectCommandPRCResponse> {
    try {
      return this.ludoService.baseReconnect(payload);
    } catch (error) {
      throw new CustomRpcException(error);
    }
  }

  @MessagePattern(
    receiveCommandTopic(GameType.Ludo, GameEngineCommandType.PLAYER_DISCONNECT),
    Transport.NATS
  )
  async userDisconnectHandler(@Payload() payload: PlayerDisconnectCommandPRCPayload): Promise<PlayerDisconnectCommandPRCResponse> {
    try {
      return this.ludoService.baseDisconnect(payload);
    } catch (error) {
      throw new CustomRpcException(error);
    }
  }

  @MessagePattern(
    receiveCommandTopic(GameType.Ludo, GameEngineCommandType.PLAYER_LEFT),
    Transport.NATS
  )
  async userLeftHandler(@Payload() payload: PlayerLeftCommandPRCPayload): Promise<PlayerLeftCommandPRCResponse> {
    try {
      return await this.ludoService.leftPlayer(payload);
    } catch (error) {
      throw new CustomRpcException(error);
    }
  }
}