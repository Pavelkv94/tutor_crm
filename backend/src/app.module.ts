import { Module } from '@nestjs/common';
import { StudentsModule } from './students/students.module';
import { LessonsModule } from './lessons/lessons.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PlansModule } from './plans/plans.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramModule } from './telegram/telegram.module';
import { ReportsModule } from './reports/reports.module';
@Module({
	imports: [
		PrismaModule,
		ConfigModule.forRoot({ isGlobal: true }),
		ScheduleModule.forRoot(),
		TelegramModule,
		StudentsModule,
		LessonsModule,
		PlansModule,
		ReportsModule
	],
	controllers: [],
	providers: [],
})
export class AppModule { }
