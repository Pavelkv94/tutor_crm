import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { CoreModule } from 'src/core/core.module';
import { TeacherRepository } from './teacher.repository';
import { BcryptService } from '../auth/bcrypt.service';

@Module({
  imports: [PassportModule, CoreModule],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherRepository, BcryptService],
	exports: [TeacherService, TeacherRepository],
})
export class TeacherModule {}
