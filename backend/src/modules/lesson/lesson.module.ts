import { Module } from '@nestjs/common';
import { LessonService } from './application/lesson.service';
import { LessonController } from './interface/lesson.controller';
import { LessonRepository } from './infrastructure/lesson.repository';
import { PlanModule } from '../plan/plan.module';
import { LessonRegularRepository } from './infrastructure/lesson-regular.repository';
import { StudentModule } from '../student/student.module';
import { TeacherModule } from '../teacher/teacher.module';
import { BalanceModule } from '@/modules/balance/balance.module';
@Module({
	imports: [PlanModule, StudentModule, TeacherModule, BalanceModule],
  controllers: [LessonController],
	providers: [LessonService, LessonRepository, LessonRegularRepository],
	exports: [LessonService],
})
export class LessonModule {}
