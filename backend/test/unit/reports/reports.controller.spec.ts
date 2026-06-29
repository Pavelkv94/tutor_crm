import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../../../src/modules/reports/interface/reports.controller';
import { ReportsService } from '../../../src/modules/reports/application/reports.service';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { FilterStudentQuery } from '../../../src/modules/student/interface/dto/requests/filter.query.dto';
import { Response } from 'express';

describe('ReportsController', () => {
	let controller: ReportsController;
	let service: ReportsService;

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

	const mockResponse = {} as Response;

	const mockSalaryData = {
		total_lessons: 5,
		teacher: { id: 1, name: 'Teacher' },
		lessons: [],
	};

	const mockService = {
		generateScheduleExcel: jest.fn(),
		generateStudentsExcel: jest.fn(),
		getDataForSalary: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ReportsController],
			providers: [
				{
					provide: ReportsService,
					useValue: mockService,
				},
			],
		}).compile();

		controller = module.get<ReportsController>(ReportsController);
		service = module.get<ReportsService>(ReportsService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('downloadSchedule', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'generateScheduleExcel').mockResolvedValue(undefined);

			await controller.downloadSchedule('2024-01-01', '2024-01-31', undefined, teacherPayload, mockResponse);

			expect(service.generateScheduleExcel).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1, mockResponse);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'generateScheduleExcel').mockResolvedValue(undefined);

			await controller.downloadSchedule('2024-01-01', '2024-01-31', '5', adminPayload, mockResponse);

			expect(service.generateScheduleExcel).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 5, mockResponse);
		});

		it('should use admin id when teacher_id not provided', async () => {
			jest.spyOn(service, 'generateScheduleExcel').mockResolvedValue(undefined);

			await controller.downloadSchedule('2024-01-01', '2024-01-31', undefined, adminPayload, mockResponse);

			expect(service.generateScheduleExcel).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 2, mockResponse);
		});
	});

	describe('downloadStudents', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'generateStudentsExcel').mockResolvedValue(undefined);

			await controller.downloadStudents(FilterStudentQuery.ALL, undefined, teacherPayload, mockResponse);

			expect(service.generateStudentsExcel).toHaveBeenCalledWith(1, FilterStudentQuery.ALL, mockResponse);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'generateStudentsExcel').mockResolvedValue(undefined);

			await controller.downloadStudents(FilterStudentQuery.ACTIVE, '5', adminPayload, mockResponse);

			expect(service.generateStudentsExcel).toHaveBeenCalledWith(5, FilterStudentQuery.ACTIVE, mockResponse);
		});
	});

	describe('getDataForSalary', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'getDataForSalary').mockResolvedValue(mockSalaryData as any);

			const result = await controller.getDataForSalary('2024-01-01', '2024-01-31', '1');

			expect(result).toEqual(mockSalaryData);
			expect(service.getDataForSalary).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1);
		});
	});
});
