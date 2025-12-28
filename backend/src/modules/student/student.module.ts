import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './student.repository';

@Module({
  controllers: [StudentController],
  providers: [StudentService, StudentRepository],
})
export class StudentModule {}
