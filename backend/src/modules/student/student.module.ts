import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './student.repository';
import { TeacherModule } from '../teacher/teacher.module';
@Module({
	imports: [TeacherModule],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
	exports: [StudentService],
})
export class StudentModule {}
