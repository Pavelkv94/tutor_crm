import { DynamicModule, Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from '../../src/modules/telegram/application/telegram.service';
import { TelegramRepository } from '../../src/modules/telegram/infrastructure/telegram.repository';
import { TelegramController } from '../../src/modules/telegram/interface/telegram.controller';
import { TeacherModule } from '../../src/modules/teacher/teacher.module';
import { StudentModule } from '../../src/modules/student/student.module';
import { LessonModule } from '../../src/modules/lesson/lesson.module';

export const createTelegramTestModule = (
	mockTelegramService?: Record<string, unknown>,
): DynamicModule => ({
	module: class TelegramTestModule {},
	imports: [
		TelegrafModule.forRoot({
			token: '000000000:TEST_TOKEN_FOR_TESTS',
			launchOptions: false,
		}),
		TeacherModule,
		StudentModule,
		LessonModule,
	],
	controllers: [TelegramController],
	providers: mockTelegramService
		? [
				{ provide: TelegramService, useValue: mockTelegramService },
				TelegramRepository,
			]
		: [TelegramService, TelegramRepository],
	exports: [TelegramService, TelegramRepository],
});
