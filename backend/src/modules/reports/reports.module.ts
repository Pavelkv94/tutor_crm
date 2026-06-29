import { Module } from '@nestjs/common';
import { ReportsService } from './application/reports.service';
import { ReportsController } from './interface/reports.controller';
import { LessonModule } from '../lesson/lesson.module';
import { TeacherModule } from '../teacher/teacher.module';
import { StudentModule } from '../student/student.module';

@Module({
	imports: [LessonModule, TeacherModule, StudentModule],
	controllers: [ReportsController],
	providers: [ReportsService],
})
export class ReportsModule {}
