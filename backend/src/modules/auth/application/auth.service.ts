import { LoginDto } from "@/modules/auth/dto/requests/login.dto";
import { RegisterAdminDto } from "@/modules/auth/dto/requests/register-admin.dto";
import { Inject, UnauthorizedException } from "@nestjs/common";
import { BcryptService } from "@/infrastructure/bcrypt/bcrypt.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RegisterAdminOutputDto } from "@/modules/auth/dto/responses/register-admin-message.dto";
import { LoginOutputDto } from "@/modules/auth/dto/responses/access-token.dto";
import { JwtPayloadDto } from "@/modules/auth/dto/jwt.payload.dto";
import { TeacherService } from "@/modules/teacher/application/teacher.service";
import { authConfig, AuthConfig } from "@/config/namespaces/auth.config";

@Injectable()
export class AuthService {
	constructor(
		// private readonly prisma: PrismaService,
		@Inject(authConfig.KEY) private readonly authConfig: AuthConfig,
		private readonly bcryptService: BcryptService,
		private readonly jwtService: JwtService,
		private readonly teacherService: TeacherService
	) { }

	async generateTokens(teacher: any): Promise<LoginOutputDto & { refreshToken: string }> {
		const jwtPayload: JwtPayloadDto = {
			id: teacher.id,
			login: teacher.login,
			name: teacher.name,
			role: teacher.role,
		};

		const accessToken = await this.jwtService.signAsync(jwtPayload, {
			secret: this.authConfig.accessSecretKey,
			expiresIn: this.authConfig.accessExpiresIn as any,
		});

		const refreshToken = await this.jwtService.signAsync(jwtPayload, {
			secret: this.authConfig.refreshSecretKey,
			expiresIn: this.authConfig.refreshExpiresIn as any,
		});

		return {
			accessToken,
			refreshToken,
		};
	}

	async registerAdmin(registerDto: RegisterAdminDto): Promise<RegisterAdminOutputDto> {
		if (registerDto.secret_key !== this.authConfig.adminRegistrationSecretKey) {
			throw new UnauthorizedException("Неверный секретный ключ");
		}
		await this.teacherService.createAdmin({
			login: registerDto.login,
			password: registerDto.password,
			name: registerDto.name,
		});
		return {
			message: "Admin registered successfully",
		};
	}

	async validateUser(loginDto: LoginDto) {
		const teacher = await this.teacherService.getTeacherByLogin(loginDto.login);
		if (!teacher) {
			throw new UnauthorizedException("Пользователь не найден");
		}
		const isPasswordValid = await this.bcryptService.checkPassword(loginDto.password, teacher.password);
		if (!isPasswordValid) {
			throw new UnauthorizedException("Неверный пароль");
		}
		return teacher;
	}
}