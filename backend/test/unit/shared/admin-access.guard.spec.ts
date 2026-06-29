import { AdminAccessGuard } from '../../../src/shared/guards/admin-access.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';

describe('AdminAccessGuard', () => {
	let guard: AdminAccessGuard;

	const createMockContext = (user: unknown): ExecutionContext => ({
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
	}) as ExecutionContext;

	beforeEach(() => {
		guard = new AdminAccessGuard();
	});

	it('should allow admin user', () => {
		const context = createMockContext({ role: TeacherRoleEnum.ADMIN });

		expect(guard.canActivate(context)).toBe(true);
	});

	it('should throw UnauthorizedException if user not authenticated', () => {
		const context = createMockContext(undefined);

		expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
		expect(() => guard.canActivate(context)).toThrow('Пользователь не аутентифицирован');
	});

	it('should throw UnauthorizedException if user is not admin', () => {
		const context = createMockContext({ role: TeacherRoleEnum.TEACHER });

		expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
		expect(() => guard.canActivate(context)).toThrow('Доступ запрещен. Требуется роль администратора.');
	});
});
