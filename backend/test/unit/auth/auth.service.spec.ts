import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { BcryptService } from '../../../src/modules/auth/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { CoreEnvConfig } from '../../../src/core/core.config';
import { TeacherService } from '../../../src/modules/teacher/teacher.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LoginInputDto } from '../../../src/modules/auth/dto/login.input.dto';
import { RegisterAdminDto } from '../../../src/modules/auth/dto/register.dto';
import { TeacherRole } from '@prisma/client';
import { Timezone } from '../../../src/modules/teacher/dto/teacher.output.dto';

describe('AuthService', () => {
	let service: AuthService;
	let bcryptService: BcryptService;
	let jwtService: JwtService;
	let teacherService: TeacherService;
	let coreEnvConfig: CoreEnvConfig;

	const mockCoreEnvConfig = {
		accessSecretKey: 'test_access_secret_key',
		accessExpiresIn: '15m',
		refreshSecretKey: 'test_refresh_secret_key',
		refreshExpiresIn: '1h',
		adminRegistrationSecretKey: 'test_admin_secret_key',
	} as CoreEnvConfig;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		password: 'hashedPassword',
		role: TeacherRole.TEACHER,
		telegram_id: null,
		telegram_link: null,
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: CoreEnvConfig,
					useValue: mockCoreEnvConfig,
				},
				{
					provide: BcryptService,
					useValue: {
						checkPassword: jest.fn(),
					},
				},
				{
					provide: JwtService,
					useValue: {
						signAsync: jest.fn(),
					},
				},
				{
					provide: TeacherService,
					useValue: {
						getTeacherByLogin: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		bcryptService = module.get<BcryptService>(BcryptService);
		jwtService = module.get<JwtService>(JwtService);
		teacherService = module.get<TeacherService>(TeacherService);
		coreEnvConfig = module.get<CoreEnvConfig>(CoreEnvConfig);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateTokens', () => {
		it('should return valid access and refresh tokens', async () => {
			const mockAccessToken = 'mock_access_token';
			const mockRefreshToken = 'mock_refresh_token';

			jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(mockAccessToken).mockResolvedValueOnce(mockRefreshToken);

			const result = await service.generateTokens(mockTeacher);

			expect(result).toHaveProperty('accessToken');
			expect(result).toHaveProperty('refreshToken');
			expect(result.accessToken).toBe(mockAccessToken);
			expect(result.refreshToken).toBe(mockRefreshToken);
			expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
		});
	});

	describe('registerAdmin', () => {
		it('should succeed with valid secret key', async () => {
			const registerDto: RegisterAdminDto = {
				login: 'admin',
				password: 'password123',
				name: 'Admin User',
				telegram_id: '123456789',
				secret_key: 'test_admin_secret_key',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(null);

			const result = await service.registerAdmin(registerDto);

			expect(result).toHaveProperty('message');
			expect(result.message).toBe('Admin registered successfully');
		});

		it('should throw UnauthorizedException with invalid secret key', async () => {
			const registerDto: RegisterAdminDto = {
				login: 'admin',
				password: 'password123',
				name: 'Admin User',
				telegram_id: '123456789',
				secret_key: 'wrong_secret_key',
			};

			await expect(service.registerAdmin(registerDto)).rejects.toThrow(UnauthorizedException);
			await expect(service.registerAdmin(registerDto)).rejects.toThrow('Неверный секретный ключ');
		});

		it('should throw BadRequestException if admin exists', async () => {
			const registerDto: RegisterAdminDto = {
				login: 'admin',
				password: 'password123',
				name: 'Admin User',
				telegram_id: '123456789',
				secret_key: 'test_admin_secret_key',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(mockTeacher);

			await expect(service.registerAdmin(registerDto)).rejects.toThrow(BadRequestException);
			await expect(service.registerAdmin(registerDto)).rejects.toThrow('Администратор уже существует');
		});
	});

	describe('validateUser', () => {
		it('should return teacher with valid credentials', async () => {
			const loginDto: LoginInputDto = {
				login: 'testuser',
				password: 'password123',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(mockTeacher);
			jest.spyOn(bcryptService, 'checkPassword').mockResolvedValue(true);

			const result = await service.validateUser(loginDto);

			expect(result).toEqual(mockTeacher);
			expect(teacherService.getTeacherByLogin).toHaveBeenCalledWith(loginDto.login);
			expect(bcryptService.checkPassword).toHaveBeenCalledWith(loginDto.password, mockTeacher.password);
		});

		it('should throw UnauthorizedException if user not found', async () => {
			const loginDto: LoginInputDto = {
				login: 'nonexistent',
				password: 'password123',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(null);

			await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
			await expect(service.validateUser(loginDto)).rejects.toThrow('Пользователь не найден');
		});

		it('should throw UnauthorizedException with wrong password', async () => {
			const loginDto: LoginInputDto = {
				login: 'testuser',
				password: 'wrongPassword',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(mockTeacher);
			jest.spyOn(bcryptService, 'checkPassword').mockResolvedValue(false);

			await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
			await expect(service.validateUser(loginDto)).rejects.toThrow('Неверный пароль');
		});
	});
});

