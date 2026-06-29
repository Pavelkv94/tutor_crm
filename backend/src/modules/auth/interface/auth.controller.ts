import { Controller, Post, Body, UseGuards, HttpCode, Res, HttpStatus } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { ApiTags } from '@nestjs/swagger';
import { RegisterAdminDto } from '../dto/requests/register-admin.dto';
import { CredentialsAuthGuard } from '@/shared/guards/credentials-auth.guard';
import { ExtractTeacherFromRequest } from '@/shared/decorators/param/extract-teacher-from-request';
import { RegisterAdminOutputDto } from '../dto/responses/register-admin-message.dto';
import { LoginOutputDto } from '../dto/responses/access-token.dto';
import { Environments } from '@/config/bootstrap-env';
import { Response } from "express";
import { LoginSwagger } from '@/shared/decorators/swagger/auth/login-swagger.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RegistrationSwagger } from '@/shared/decorators/swagger/auth/registration-swagger.decorator';
import { RefreshTokenSwagger } from '@/shared/decorators/swagger/auth/refresh-swagger.decorator';
import { JwtRefreshAuthGuard } from '@/shared/guards/jwt-refresh.guard';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@LoginSwagger()
	@UseGuards(CredentialsAuthGuard)
	@Post('login')
	@HttpCode(HttpStatus.OK)
	async login(@ExtractTeacherFromRequest() teacher: any, @Res({ passthrough: true }) response: Response): Promise<LoginOutputDto> {
		const { accessToken, refreshToken } = await this.authService.generateTokens(teacher);
		response.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === Environments.PRODUCTION, // secure только в проде, а для тестов false
			sameSite: "lax",
		});
		return { accessToken };
	}

	@RegistrationSwagger()
	@Post('register-admin')
	@HttpCode(HttpStatus.CREATED)
	registerAdmin(@Body() registerDto: RegisterAdminDto): Promise<RegisterAdminOutputDto> {
		return this.authService.registerAdmin(registerDto);
	}

	@RefreshTokenSwagger()
	@UseGuards(JwtRefreshAuthGuard)
	@Post('refresh-token')
	@HttpCode(HttpStatus.OK)
	async refreshToken(@ExtractTeacherFromRequest() teacher: any, @Res({ passthrough: true }) response: Response): Promise<LoginOutputDto> {
		const { accessToken, refreshToken } = await this.authService.generateTokens(teacher);
		response.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === Environments.PRODUCTION, // secure только в проде, а для тестов false
			sameSite: "lax",
		});
		return { accessToken };
	}
}