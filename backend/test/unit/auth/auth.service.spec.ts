import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/application/auth.service';
import { BcryptService } from '../../../src/infrastructure/bcrypt/bcrypt.service';
import { JwtService } from '@nestjs/jwt';
import { authConfig, AuthConfig } from '../../../src/config/namespaces/auth.config';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../../src/modules/auth/dto/requests/login.dto';
import { RegisterAdminDto } from '../../../src/modules/auth/dto/requests/register-admin.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { Timezone } from '../../../src/modules/teacher/interface/dto/responses/teacher.dto';

describe('AuthService', () => {
	let service: AuthService;
	let bcryptService: BcryptService;
	let jwtService: JwtService;
	let teacherService: TeacherService;

	const mockAuthConfig = {
		accessSecretKey: 'test_access_secret_key',
		accessExpiresIn: '15m',
		refreshSecretKey: 'test_refresh_secret_key',
		refreshExpiresIn: '1h',
		adminRegistrationSecretKey: 'test_admin_secret_key',
	} as AuthConfig;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		password: 'hashedPassword',
		role: TeacherRoleEnum.TEACHER,
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: authConfig.KEY,
					useValue: mockAuthConfig,
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
						createAdmin: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
		bcryptService = module.get<BcryptService>(BcryptService);
		jwtService = module.get<JwtService>(JwtService);
		teacherService = module.get<TeacherService>(TeacherService);
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
				secret_key: 'test_admin_secret_key',
			};

			jest.spyOn(teacherService, 'createAdmin').mockResolvedValue(undefined);

			const result = await service.registerAdmin(registerDto);

			expect(result).toHaveProperty('message');
			expect(result.message).toBe('Admin registered successfully');
			expect(teacherService.createAdmin).toHaveBeenCalledWith({
				login: registerDto.login,
				password: registerDto.password,
				name: registerDto.name,
			});
		});

		it('should throw UnauthorizedException with invalid secret key', async () => {
			const registerDto: RegisterAdminDto = {
				login: 'admin',
				password: 'password123',
				name: 'Admin User',
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
				secret_key: 'test_admin_secret_key',
			};

			jest
				.spyOn(teacherService, 'createAdmin')
				.mockRejectedValue(new BadRequestException('Администратор уже существует'));

			await expect(service.registerAdmin(registerDto)).rejects.toThrow(BadRequestException);
			await expect(service.registerAdmin(registerDto)).rejects.toThrow('Администратор уже существует');
		});
	});

	describe('validateUser', () => {
		it('should return teacher with valid credentials', async () => {
			const loginDto: LoginDto = {
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
			const loginDto: LoginDto = {
				login: 'nonexistent',
				password: 'password123',
			};

			jest.spyOn(teacherService, 'getTeacherByLogin').mockResolvedValue(null);

			await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
			await expect(service.validateUser(loginDto)).rejects.toThrow('Пользователь не найден');
		});

		it('should throw UnauthorizedException with wrong password', async () => {
			const loginDto: LoginDto = {
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
