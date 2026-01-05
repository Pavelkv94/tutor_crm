import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { CoreModule } from 'src/core/core.module';
import { CoreEnvConfig } from 'src/core/core.config';
import { TelegramRepository } from './telegram.repository';
import { TeacherModule } from '../teacher/teacher.module';
import { StudentModule } from '../student/student.module';
import { TelegramController } from './telegram.controller';
import { LessonModule } from '../lesson/lesson.module';

@Module({
  imports: [
		CoreModule,
    TelegrafModule.forRootAsync({
			imports: [CoreModule],
      useFactory: (configService: CoreEnvConfig) => ({
        token: configService.telegramBotToken,
      }),
			inject: [CoreEnvConfig]
    }),
		TeacherModule,
		StudentModule,
		LessonModule,
  ],
	controllers: [TelegramController],
  providers: [TelegramService, TelegramRepository],
	exports: [TelegramService, TelegramRepository]
})
export class TelegramModule { }
