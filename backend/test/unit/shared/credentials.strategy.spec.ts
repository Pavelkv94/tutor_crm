import { CredentialsStrategy } from '../../../src/shared/guards/credentials.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/modules/auth/application/auth.service';

describe('CredentialsStrategy', () => {
	let strategy: CredentialsStrategy;
	let authService: AuthService;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
	};

	beforeEach(() => {
		authService = {
			validateUser: jest.fn(),
		} as unknown as AuthService;
		strategy = new CredentialsStrategy(authService);
	});

	describe('validate', () => {
		it('should return teacher for valid credentials', async () => {
			jest.spyOn(authService, 'validateUser').mockResolvedValue(mockTeacher as any);

			const result = await strategy.validate('testuser', 'password123');

			expect(result).toEqual(mockTeacher);
			expect(authService.validateUser).toHaveBeenCalledWith({ login: 'testuser', password: 'password123' });
		});

		it('should throw UnauthorizedException if user not found', async () => {
			jest.spyOn(authService, 'validateUser').mockResolvedValue(null as any);

			await expect(strategy.validate('testuser', 'wrong')).rejects.toThrow(UnauthorizedException);
			await expect(strategy.validate('testuser', 'wrong')).rejects.toThrow('Неверные учетные данные');
		});
	});
});
