import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/interface/auth.controller';
import { AuthService } from '../../../src/modules/auth/application/auth.service';
import { RegisterAdminDto } from '../../../src/modules/auth/dto/requests/register-admin.dto';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('AuthController', () => {
	let controller: AuthController;
	let service: AuthService;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		role: 'TEACHER',
	};

	const mockResponse = {
		cookie: jest.fn(),
	} as unknown as Response;

	const mockService = {
		generateTokens: jest.fn(),
		registerAdmin: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: mockService,
				},
			],
		})
			.overrideGuard(ThrottlerGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AuthController>(AuthController);
		service = module.get<AuthService>(AuthService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('login', () => {
		it('should set refresh token cookie and return access token', async () => {
			jest.spyOn(service, 'generateTokens').mockResolvedValue({
				accessToken: 'access_token',
				refreshToken: 'refresh_token',
			});

			const result = await controller.login(mockTeacher, mockResponse);

			expect(result).toEqual({ accessToken: 'access_token' });
			expect(service.generateTokens).toHaveBeenCalledWith(mockTeacher);
			expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_token', {
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
			});
		});
	});

	describe('registerAdmin', () => {
		it('should delegate to service', async () => {
			const dto: RegisterAdminDto = {
				login: 'admin',
				password: 'password123',
				name: 'Admin',
				secret_key: 'secret',
			};
			const mockOutput = { message: 'Admin registered successfully' };
			jest.spyOn(service, 'registerAdmin').mockResolvedValue(mockOutput);

			const result = await controller.registerAdmin(dto);

			expect(result).toEqual(mockOutput);
			expect(service.registerAdmin).toHaveBeenCalledWith(dto);
		});
	});

	describe('refreshToken', () => {
		it('should set refresh token cookie and return access token', async () => {
			jest.spyOn(service, 'generateTokens').mockResolvedValue({
				accessToken: 'new_access_token',
				refreshToken: 'new_refresh_token',
			});

			const result = await controller.refreshToken(mockTeacher, mockResponse);

			expect(result).toEqual({ accessToken: 'new_access_token' });
			expect(service.generateTokens).toHaveBeenCalledWith(mockTeacher);
			expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', 'new_refresh_token', {
				httpOnly: true,
				secure: false,
				sameSite: 'lax',
			});
		});
	});
});
