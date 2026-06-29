import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExtractTeacherFromRequest } from '../../../src/shared/decorators/param/extract-teacher-from-request';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';

const getParamDecoratorFactory = (decorator: (...args: unknown[]) => ParameterDecorator) => {
	class TestController {
		test(@decorator() _value: unknown) {}
	}

	const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
	return args[Object.keys(args)[0]].factory;
};

describe('ExtractTeacherFromRequest', () => {
	const mockUser = {
		id: '1',
		login: 'testuser',
		name: 'Test User',
		role: TeacherRoleEnum.TEACHER,
	};

	const createMockContext = (user: unknown): ExecutionContext => ({
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
	}) as ExecutionContext;

	it('should return user from request', () => {
		const factory = getParamDecoratorFactory(ExtractTeacherFromRequest);
		const context = createMockContext(mockUser);

		expect(factory(undefined, context)).toEqual(mockUser);
	});

	it('should throw error if user not in request', () => {
		const factory = getParamDecoratorFactory(ExtractTeacherFromRequest);
		const context = createMockContext(undefined);

		expect(() => factory(undefined, context)).toThrow('There is no teacher in the request object!');
	});
});
