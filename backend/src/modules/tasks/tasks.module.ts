import { Module } from '@nestjs/common';
import { TeacherModule } from '@/modules/teacher/teacher.module';
import { TasksRepositoryPort } from './ports/tasks.repository.port';
import { TasksController } from './tasks.controller';
import { TasksEventsService } from './tasks-events.service';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
	imports: [TeacherModule],
	controllers: [TasksController],
	providers: [
		TasksEventsService,
		TasksService,
		{ provide: TasksRepositoryPort, useClass: TasksRepository },
	],
	exports: [TasksService],
})
export class TasksModule {}
