import { Module } from '@nestjs/common';
import { StudentService } from './application/student.service';
import { StudentController } from './interface/student.controller';
import { StudentRepository } from './infrastructure/student.repository';
import { TeacherModule } from '../teacher/teacher.module';
@Module({
	imports: [TeacherModule],
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
	exports: [StudentService],
})
export class StudentModule {}
