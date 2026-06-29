import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from '../../../src/modules/student/interface/student.controller';
import { StudentService } from '../../../src/modules/student/application/student.service';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { CreateStudentDto } from '../../../src/modules/student/interface/dto/requests/create-student.dto';
import { UpdateStudentDto } from '../../../src/modules/student/interface/dto/requests/update-student.dto';
import { FilterStudentQuery } from '../../../src/modules/student/interface/dto/requests/filter.query.dto';

describe('StudentController', () => {
	let controller: StudentController;
	let service: StudentService;

	const mockStudentOutput = {
		id: 1,
		name: 'Test Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
		teacher_id: 1,
		balance: 0,
		bookUntilCancellation: false,
		notifyAboutBirthday: false,
		notifyAboutLessons: false,
	};

	const teacherPayload: JwtPayloadDto = {
		id: '1',
		login: 'teacher',
		name: 'Teacher',
		role: TeacherRoleEnum.TEACHER,
	};

	const adminPayload: JwtPayloadDto = {
		id: '2',
		login: 'admin',
		name: 'Admin',
		role: TeacherRoleEnum.ADMIN,
	};

	const mockService = {
		create: jest.fn(),
		findAllForCurrentTeacher: jest.fn(),
		findById: jest.fn(),
		update: jest.fn(),
		remove: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [StudentController],
			providers: [
				{
					provide: StudentService,
					useValue: mockService,
				},
			],
		}).compile();

		controller = module.get<StudentController>(StudentController);
		service = module.get<StudentService>(StudentService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('create', () => {
		it('should delegate to service', async () => {
			const dto: CreateStudentDto = {
				name: 'New Student',
				class: 5,
				birth_date: new Date('2010-01-15'),
				teacher_id: 1,
				timezone: 'BY' as any,
			};
			jest.spyOn(service, 'create').mockResolvedValue(mockStudentOutput as any);

			const result = await controller.create(dto);

			expect(result).toEqual(mockStudentOutput);
			expect(service.create).toHaveBeenCalledWith(dto);
		});
	});

	describe('findAllForCurrentTeacher', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'findAllForCurrentTeacher').mockResolvedValue([mockStudentOutput] as any);

			const result = await controller.findAllForCurrentTeacher(teacherPayload, FilterStudentQuery.ALL, undefined);

			expect(result).toEqual([mockStudentOutput]);
			expect(service.findAllForCurrentTeacher).toHaveBeenCalledWith(1, FilterStudentQuery.ALL);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'findAllForCurrentTeacher').mockResolvedValue([]);

			await controller.findAllForCurrentTeacher(adminPayload, FilterStudentQuery.ACTIVE, '5');

			expect(service.findAllForCurrentTeacher).toHaveBeenCalledWith(5, FilterStudentQuery.ACTIVE);
		});

		it('should use admin id when teacher_id not provided', async () => {
			jest.spyOn(service, 'findAllForCurrentTeacher').mockResolvedValue([]);

			await controller.findAllForCurrentTeacher(adminPayload, FilterStudentQuery.ALL, undefined);

			expect(service.findAllForCurrentTeacher).toHaveBeenCalledWith(2, FilterStudentQuery.ALL);
		});
	});

	describe('findOne', () => {
		it('should delegate to service', async () => {
			const mockExtended = { ...mockStudentOutput, teacher: { id: 1, name: 'Teacher' } };
			jest.spyOn(service, 'findById').mockResolvedValue(mockExtended as any);

			const result = await controller.findOne('1');

			expect(result).toEqual(mockExtended);
			expect(service.findById).toHaveBeenCalledWith(1);
		});
	});

	describe('update', () => {
		it('should delegate to service', async () => {
			const dto: UpdateStudentDto = { name: 'Updated', class: 6, birth_date: new Date('2010-01-15') };
			jest.spyOn(service, 'update').mockResolvedValue(undefined);

			await controller.update('1', dto);

			expect(service.update).toHaveBeenCalledWith(1, dto);
		});
	});

	describe('delete', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'remove').mockResolvedValue(undefined);

			await controller.delete('1');

			expect(service.remove).toHaveBeenCalledWith(1);
		});
	});
});
