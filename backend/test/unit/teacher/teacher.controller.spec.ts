import { Test, TestingModule } from '@nestjs/testing';
import { TeacherController } from '../../../src/modules/teacher/interface/teacher.controller';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { CreateTeacherDto } from '../../../src/modules/teacher/interface/dto/requests/create-teacher.input.dto';
import { UpdateTeacherDto } from '../../../src/modules/teacher/interface/dto/requests/update-teacher.input.dto';
import { FilterTeacherQuery } from '../../../src/modules/teacher/interface/dto/requests/filter.query.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { Timezone } from '../../../src/modules/teacher/interface/dto/responses/teacher.dto';

describe('TeacherController', () => {
	let controller: TeacherController;
	let service: TeacherService;

	const mockTeacherOutput = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		telegram_id: null,
		telegram_link: null,
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
		role: TeacherRoleEnum.TEACHER,
		telegrams: [],
	};

	const mockService = {
		getTeachers: jest.fn(),
		createTeacher: jest.fn(),
		updateTeacher: jest.fn(),
		deleteTeacher: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TeacherController],
			providers: [
				{
					provide: TeacherService,
					useValue: mockService,
				},
			],
		}).compile();

		controller = module.get<TeacherController>(TeacherController);
		service = module.get<TeacherService>(TeacherService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getTeachers', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'getTeachers').mockResolvedValue([mockTeacherOutput]);

			const result = await controller.getTeachers(FilterTeacherQuery.ALL);

			expect(result).toEqual([mockTeacherOutput]);
			expect(service.getTeachers).toHaveBeenCalledWith(FilterTeacherQuery.ALL);
		});
	});

	describe('createTeacher', () => {
		it('should delegate to service', async () => {
			const dto: CreateTeacherDto = {
				login: 'newuser',
				password: 'password123',
				name: 'New User',
				timezone: Timezone.BY,
			};
			jest.spyOn(service, 'createTeacher').mockResolvedValue(mockTeacherOutput);

			const result = await controller.createTeacher(dto);

			expect(result).toEqual(mockTeacherOutput);
			expect(service.createTeacher).toHaveBeenCalledWith(dto);
		});
	});

	describe('updateTeacher', () => {
		it('should delegate to service', async () => {
			const dto: UpdateTeacherDto = { name: 'Updated', timezone: Timezone.BY };
			jest.spyOn(service, 'updateTeacher').mockResolvedValue(undefined);

			await controller.updateTeacher('1', dto);

			expect(service.updateTeacher).toHaveBeenCalledWith(1, dto);
		});
	});

	describe('deleteTeacher', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'deleteTeacher').mockResolvedValue(undefined);

			await controller.deleteTeacher('1');

			expect(service.deleteTeacher).toHaveBeenCalledWith(1);
		});
	});
});
