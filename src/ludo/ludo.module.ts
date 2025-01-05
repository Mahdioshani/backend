import { Module } from '@nestjs/common';
import { LudoService } from './ludo.service';
import { ConfigService } from '@nestjs/config';
import { LudoController } from './ludo.controller';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  imports: [],
  providers: [
    {
      provide: 'GAME_ENGINE_SERVICE',
      useFactory: (configService: ConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') + ":" + configService.get<string>('NATS_PORT')],
            queue: 'game-engine-service',
          },
        });
      },
      inject: [ConfigService],
    },
    LudoService,
  ],
  controllers: [LudoController],
})
export class LudoModule { }
