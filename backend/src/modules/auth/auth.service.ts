import { PrismaService } from "src/core/prisma/prisma.service";
import { LoginInputDto } from "./dto/login.input.dto";
import { RegisterAdminDto } from "./dto/register.dto";
import { CoreEnvConfig } from "src/core/core.config";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { BcryptService } from "./bcrypt.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RegisterAdminOutputDto } from "./dto/register-admin.output.dto";
import { LoginOutputDto } from "./dto/login.output.dto";
import { JwtPayloadDto } from "./dto/jwt.payload.dto";
import { TeacherService } from "../teacher/teacher.service";

@Injectable()
export class AuthService {
	constructor(
		// private readonly prisma: PrismaService,
		private readonly coreEnvConfig: CoreEnvConfig,
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
			secret: this.coreEnvConfig.accessSecretKey,
			expiresIn: this.coreEnvConfig.accessExpiresIn as any,
		});

		const refreshToken = await this.jwtService.signAsync(jwtPayload, {
			secret: this.coreEnvConfig.refreshSecretKey,
			expiresIn: this.coreEnvConfig.refreshExpiresIn as any,
		});

		return {
			accessToken,
			refreshToken,
		};
	}

	async registerAdmin(registerDto: RegisterAdminDto): Promise<RegisterAdminOutputDto> {
		if (registerDto.secret_key !== this.coreEnvConfig.adminRegistrationSecretKey) {
			throw new UnauthorizedException("Неверный секретный ключ");
		}

		const teacher = await this.teacherService.getTeacherByLogin(registerDto.login);
		if (teacher) {
			throw new BadRequestException("Администратор уже существует");
		}
		return {
			message: "Admin registered successfully",
		};
	}

	async validateUser(loginDto: LoginInputDto) {
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