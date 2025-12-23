import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { CredentialsStrategy } from '../../core/guards/credentials.strategy';
import { CoreModule } from 'src/core/core.module';
import { JwtModule } from '@nestjs/jwt';	
import { JwtRefreshStrategy } from 'src/core/guards/jwt-refresh.strategy';
import { JwtAccessStrategy } from 'src/core/guards/jwt-access.strategy';
import { TeacherModule } from '../teacher/teacher.module';

@Module({
	imports: [
		PassportModule,
		CoreModule,
		JwtModule.register({}),
		TeacherModule,
	],
	controllers: [AuthController],
	providers: [AuthService, BcryptService, CredentialsStrategy, JwtRefreshStrategy, JwtAccessStrategy],
})
export class AuthModule { }
