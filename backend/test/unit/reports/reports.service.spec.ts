import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../../../src/modules/reports/application/reports.service';
import { LessonService } from '../../../src/modules/lesson/application/lesson.service';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { StudentService } from '../../../src/modules/student/application/student.service';
import { FilterStudentQuery } from '../../../src/modules/student/interface/dto/requests/filter.query.dto';
import { LessonStatusEnum } from '../../../src/modules/lesson/interface/dto/lesson-status.enum';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';

jest.mock('../../../src/modules/reports/schedule-excel.util', () => ({
	buildScheduleExcel: jest.fn(),
}));

jest.mock('../../../src/modules/reports/students-excel.util', () => ({
	buildStudentsExcel: jest.fn(),
}));

import { buildScheduleExcel } from '../../../src/modules/reports/schedule-excel.util';
import { buildStudentsExcel } from '../../../src/modules/reports/students-excel.util';

describe('ReportsService', () => {
	let service: ReportsService;
	let lessonService: LessonService;
	let teacherService: TeacherService;
	let studentService: StudentService;

	const mockTeacher = {
		id: 1,
		name: 'Test Teacher',
		login: 'teacher',
	};

	const mockLessons = [
		{
			id: 1,
			status: LessonStatusEnum.COMPLETED_PAID,
			teacher: { id: 1 },
			plan: {
				id: 1,
				plan_name: 'Individual',
				plan_price: 100000,
				plan_currency: 'USD',
				duration: 10,
				plan_type: 'INDIVIDUAL',
			},
		},
		{
			id: 2,
			status: LessonStatusEnum.COMPLETED_PAID,
			teacher: { id: 1 },
			plan: {
				id: 1,
				plan_name: 'Individual',
				plan_price: 100000,
				plan_currency: 'USD',
				duration: 10,
				plan_type: 'INDIVIDUAL',
			},
		},
		{
			id: 3,
			status: LessonStatusEnum.PENDING_UNPAID,
			teacher: { id: 1 },
			plan: {
				id: 2,
				plan_name: 'Group',
				plan_price: 50000,
				plan_currency: 'USD',
				duration: 10,
				plan_type: 'GROUP',
			},
		},
	];

	const mockWorkbook = {
		xlsx: {
			write: jest.fn().mockResolvedValue(undefined),
		},
	};

	const createMockResponse = (): Response => ({
		setHeader: jest.fn(),
		end: jest.fn(),
	}) as unknown as Response;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ReportsService,
				{
					provide: LessonService,
					useValue: {
						findLessonsForPeriod: jest.fn(),
						findLessonsForPeriodForSalary: jest.fn(),
					},
				},
				{
					provide: TeacherService,
					useValue: {
						getTeacherById: jest.fn(),
					},
				},
				{
					provide: StudentService,
					useValue: {
						findAllForCurrentTeacher: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ReportsService>(ReportsService);
		lessonService = module.get<LessonService>(LessonService);
		teacherService = module.get<TeacherService>(TeacherService);
		studentService = module.get<StudentService>(StudentService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateScheduleExcel', () => {
		it('should generate schedule excel and write to response', async () => {
			const res = createMockResponse();
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(lessonService, 'findLessonsForPeriod').mockResolvedValue(mockLessons as any);
			(buildScheduleExcel as jest.Mock).mockReturnValue(mockWorkbook);

			await service.generateScheduleExcel('2024-01-01', '2024-01-31', 1, res);

			expect(teacherService.getTeacherById).toHaveBeenCalledWith(1);
			expect(lessonService.findLessonsForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1);
			expect(buildScheduleExcel).toHaveBeenCalledWith(mockLessons, '2024-01-01', '2024-01-31', 'Test Teacher');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			);
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				expect.stringContaining('schedule_2024-01-01_2024-01-31.xlsx'),
			);
			expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(res);
			expect(res.end).toHaveBeenCalled();
		});

		it('should use fallback teacher name when teacher not found', async () => {
			const res = createMockResponse();
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);
			jest.spyOn(lessonService, 'findLessonsForPeriod').mockResolvedValue([]);
			(buildScheduleExcel as jest.Mock).mockReturnValue(mockWorkbook);

			await service.generateScheduleExcel('2024-01-01', '2024-01-31', 1, res);

			expect(buildScheduleExcel).toHaveBeenCalledWith([], '2024-01-01', '2024-01-31', 'Неизвестный преподаватель');
		});
	});

	describe('generateStudentsExcel', () => {
		it('should generate students excel with active filter', async () => {
			const res = createMockResponse();
			const mockStudents = [{ id: 1, name: 'Student' }];
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(studentService, 'findAllForCurrentTeacher').mockResolvedValue(mockStudents as any);
			(buildStudentsExcel as jest.Mock).mockReturnValue(mockWorkbook);

			await service.generateStudentsExcel(1, FilterStudentQuery.ACTIVE, res);

			expect(studentService.findAllForCurrentTeacher).toHaveBeenCalledWith(1, FilterStudentQuery.ACTIVE);
			expect(buildStudentsExcel).toHaveBeenCalledWith(mockStudents, 'Test Teacher');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				expect.stringContaining('students_active_1.xlsx'),
			);
			expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(res);
			expect(res.end).toHaveBeenCalled();
		});

		it('should use deleted filter in filename', async () => {
			const res = createMockResponse();
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(studentService, 'findAllForCurrentTeacher').mockResolvedValue([]);
			(buildStudentsExcel as jest.Mock).mockReturnValue(mockWorkbook);

			await service.generateStudentsExcel(1, FilterStudentQuery.DELETED, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				expect.stringContaining('students_deleted_1.xlsx'),
			);
		});
	});

	describe('getDataForSalary', () => {
		it('should aggregate completed lessons by plan', async () => {
			jest.spyOn(lessonService, 'findLessonsForPeriodForSalary').mockResolvedValue(mockLessons as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);

			const result = await service.getDataForSalary('2024-01-01', '2024-01-31', 1);

			expect(result.total_lessons).toBe(2);
			expect(result.teacher).toEqual(mockTeacher);
			expect(result.lessons).toHaveLength(1);
			expect(result.lessons[0]).toEqual({
				plan_name: 'Individual',
				plan_price: 100000,
				plan_currency: 'USD',
				duration: 10,
				plan_type: 'INDIVIDUAL',
				lessons_count: 2,
			});
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(lessonService, 'findLessonsForPeriodForSalary').mockResolvedValue([]);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.getDataForSalary('2024-01-01', '2024-01-31', 1)).rejects.toThrow(NotFoundException);
			await expect(service.getDataForSalary('2024-01-01', '2024-01-31', 1)).rejects.toThrow('Teacher with id 1 not found');
		});
	});
});
