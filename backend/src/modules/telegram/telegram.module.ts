import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { CoreModule } from 'src/core/core.module';
import { CoreEnvConfig } from 'src/core/core.config';
import { TelegramRepository } from './telegram.repository';

@Module({
  imports: [
		CoreModule,
    TelegrafModule.forRootAsync({
      useFactory: (configService: CoreEnvConfig) => ({
        token: configService.telegramBotToken,
      }),
			inject: [CoreEnvConfig]
    }),
  ],
  providers: [TelegramService, TelegramRepository],
	exports: [TelegramService]
})
export class TelegramModule { }
