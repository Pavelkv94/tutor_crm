import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { LessonRepository } from './lesson.repository';
import { PlanModule } from '../plan/plan.module';
import { LessonRegularRepository } from './lesson-regular.repository';

@Module({
  imports: [PlanModule],
  controllers: [LessonController],
	providers: [LessonService, LessonRepository, LessonRegularRepository],
})
export class LessonModule {}
