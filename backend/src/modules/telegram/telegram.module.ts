import { Module } from '@nestjs/common';
import { TelegramService } from '@/modules/telegram/application/telegram.service';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramRepository } from '@/modules/telegram/infrastructure/telegram.repository';
import { TeacherModule } from '@/modules/teacher/teacher.module';
import { StudentModule } from '@/modules/student/student.module';
import { TelegramController } from '@/modules/telegram/interface/telegram.controller';
import { LessonModule } from '@/modules/lesson/lesson.module';
import { telegramConfig, TelegramConfig } from '@/config/namespaces/telegram.config';

@Module({
	imports: [
    TelegrafModule.forRootAsync({
			useFactory: (telegramConfig: TelegramConfig) => ({
				token: telegramConfig.botToken,
      }),
			inject: [telegramConfig.KEY]
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
