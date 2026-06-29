import { JwtAccessStrategy } from '../../../src/shared/guards/jwt-access.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { AuthConfig } from '../../../src/config/namespaces/auth.config';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';

describe('JwtAccessStrategy', () => {
	let strategy: JwtAccessStrategy;

	const mockAuthConfig: AuthConfig = {
		accessSecretKey: 'test_access_secret',
		accessExpiresIn: '15m',
		refreshSecretKey: 'test_refresh_secret',
		refreshExpiresIn: '1h',
		adminRegistrationSecretKey: 'test_admin_secret',
	};

	beforeEach(() => {
		strategy = new JwtAccessStrategy(mockAuthConfig);
	});

	describe('validate', () => {
		it('should return user payload for valid token', async () => {
			const payload = {
				id: '1',
				login: 'testuser',
				name: 'Test User',
				role: TeacherRoleEnum.TEACHER,
			};

			const result = await strategy.validate(payload);

			expect(result).toEqual({
				id: '1',
				login: 'testuser',
				name: 'Test User',
				role: TeacherRoleEnum.TEACHER,
			});
		});

		it('should throw UnauthorizedException for empty payload', async () => {
			await expect(strategy.validate(null as any)).rejects.toThrow(UnauthorizedException);
			await expect(strategy.validate(null as any)).rejects.toThrow('Неверная полезная нагрузка токена');
		});

		it('should throw UnauthorizedException for payload without id', async () => {
			const payload = { login: 'testuser', name: 'Test', role: TeacherRoleEnum.TEACHER };

			await expect(strategy.validate(payload as any)).rejects.toThrow(UnauthorizedException);
		});
	});
});
