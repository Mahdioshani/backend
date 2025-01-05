import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LudoModule } from './ludo/ludo.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LudoModule
  ],
})

export class CoreModule {

}


