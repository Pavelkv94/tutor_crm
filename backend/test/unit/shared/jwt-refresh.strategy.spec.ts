import { JwtRefreshStrategy } from '../../../src/shared/guards/jwt-refresh.strategy';
import { UnauthorizedException } from '@nestjs/common';
import { AuthConfig } from '../../../src/config/namespaces/auth.config';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';

describe('JwtRefreshStrategy', () => {
	let strategy: JwtRefreshStrategy;
	let teacherService: TeacherService;

	const mockAuthConfig: AuthConfig = {
		accessSecretKey: 'test_access_secret',
		accessExpiresIn: '15m',
		refreshSecretKey: 'test_refresh_secret',
		refreshExpiresIn: '1h',
		adminRegistrationSecretKey: 'test_admin_secret',
	};

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
	};

	beforeEach(() => {
		teacherService = {
			getTeacherById: jest.fn(),
		} as unknown as TeacherService;
		strategy = new JwtRefreshStrategy(teacherService, mockAuthConfig);
	});

	describe('validate', () => {
		it('should return teacher for valid payload', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);

			const result = await strategy.validate({ id: '1', login: 'testuser', name: 'Test', role: 'TEACHER' });

			expect(result).toEqual(mockTeacher);
			expect(teacherService.getTeacherById).toHaveBeenCalledWith(1);
		});

		it('should throw UnauthorizedException if teacher not found', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(strategy.validate({ id: '999', login: 'x', name: 'X', role: 'TEACHER' })).rejects.toThrow(UnauthorizedException);
			await expect(strategy.validate({ id: '999', login: 'x', name: 'X', role: 'TEACHER' })).rejects.toThrow('Преподаватель не найден');
		});
	});
});
