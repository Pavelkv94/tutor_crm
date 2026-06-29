import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './interface/auth.controller';
import { AuthService } from './application/auth.service';
import { BcryptService } from '../../infrastructure/bcrypt/bcrypt.service';
import { CredentialsStrategy } from '@/shared/guards/credentials.strategy';
import { AppConfigModule } from '@/config/app-config.module';
import { JwtModule } from '@nestjs/jwt';	
import { JwtRefreshStrategy } from '@/shared/guards/jwt-refresh.strategy';
import { JwtAccessStrategy } from '@/shared/guards/jwt-access.strategy';
import { TeacherModule } from '../teacher/teacher.module';
import { BcryptModule } from '@/infrastructure/bcrypt/bcrypt.module';

@Module({
	imports: [
		PassportModule,
		AppConfigModule,
		JwtModule.register({}),
		BcryptModule,
		TeacherModule,
	],
	controllers: [AuthController],
	providers: [AuthService, BcryptService, CredentialsStrategy, JwtRefreshStrategy, JwtAccessStrategy],
})
export class AuthModule { }
