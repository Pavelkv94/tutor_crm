import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TeacherController } from './interface/teacher.controller';
import { TeacherService } from './application/teacher.service';
import { AppConfigModule } from '@/config/app-config.module';
import { TeacherRepository } from './infrastructure/teacher.repository';
import { BcryptModule } from '@/infrastructure/bcrypt/bcrypt.module';

@Module({
	imports: [PassportModule, AppConfigModule, BcryptModule],
  controllers: [TeacherController],
	providers: [TeacherService, TeacherRepository],
	exports: [TeacherService, TeacherRepository],
})
export class TeacherModule {}
