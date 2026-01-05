import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { TeacherModule } from './modules/teacher/teacher.module';
import { PlanModule } from './modules/plan/plan.module';
import { StudentModule } from './modules/student/student.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TelegramModule } from './modules/telegram/telegram.module';
@Module({
	imports: [
		CoreModule,
		ThrottlerModule.forRoot([
			{
				ttl: 10000,
				limit: 5,
			},
		]),
		AuthModule,
		TeacherModule,
		PlanModule,
		StudentModule,
		LessonModule,
		ReportsModule,
		TelegramModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule { }
