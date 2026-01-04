import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { LessonRepository } from './lesson.repository';
import { PlanModule } from '../plan/plan.module';
import { LessonRegularRepository } from './lesson-regular.repository';
import { StudentModule } from '../student/student.module';
import { TeacherModule } from '../teacher/teacher.module';
@Module({
	imports: [PlanModule, StudentModule, TeacherModule],
  controllers: [LessonController],
	providers: [LessonService, LessonRepository, LessonRegularRepository],
	exports: [LessonService],
})
export class LessonModule {}
