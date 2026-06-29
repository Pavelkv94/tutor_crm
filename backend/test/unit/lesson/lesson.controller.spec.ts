import { Test, TestingModule } from '@nestjs/testing';
import { LessonController } from '../../../src/modules/lesson/interface/lesson.controller';
import { LessonService } from '../../../src/modules/lesson/application/lesson.service';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { SingleLessonInputDto } from '../../../src/modules/lesson/interface/dto/requests/single-lesson.input.dto';
import { RescheduledLessonInputDto } from '../../../src/modules/lesson/interface/dto/requests/rescheduled-lesson.input.dto';
import { RegularLessonsInputDto, WeekDay } from '../../../src/modules/lesson/interface/dto/requests/regular-lesson.input.dto';
import { ChangeTeacherDto } from '../../../src/modules/lesson/interface/dto/requests/change-teacher.dto';
import { CancelLessonDto, CancelationStatusEnum } from '../../../src/modules/lesson/interface/dto/requests/cancel-lesson.dto';
import { ManageFreeLessonStatusDto } from '../../../src/modules/lesson/interface/dto/requests/manage-free-lesson.input.dto';
import { UpdateLessonsPlanForPeriodDto } from '../../../src/modules/lesson/interface/dto/requests/update-lesson-plan.input.dto';

describe('LessonController', () => {
	let controller: LessonController;
	let service: LessonService;

	const mockLessonOutput = {
		id: 1,
		student_id: 1,
		teacher_id: 1,
		plan_id: 1,
		date: new Date(),
		is_free: false,
		is_regular: false,
		status: 'PENDING_UNPAID',
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
		findLessonsForPeriod: jest.fn(),
		findLessonsForPeriodAndStudent: jest.fn(),
		findLessonsForReschedule: jest.fn(),
		createSingleLessonByAdmin: jest.fn(),
		createRescheduledLesson: jest.fn(),
		createRegularLessons: jest.fn(),
		getRegularLessons: jest.fn(),
		findLessonsByStartDate: jest.fn(),
		changeTeacher: jest.fn(),
		cancelLesson: jest.fn(),
		manageFreeLessonStatus: jest.fn(),
		deleteLesson: jest.fn(),
		updateLessonsPlanForPeriod: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [LessonController],
			providers: [
				{
					provide: LessonService,
					useValue: mockService,
				},
			],
		}).compile();

		controller = module.get<LessonController>(LessonController);
		service = module.get<LessonService>(LessonService);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('findLessonsForPeriod', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'findLessonsForPeriod').mockResolvedValue([mockLessonOutput] as any);

			const result = await controller.findLessonsForPeriod('2024-01-01', '2024-01-31', undefined, teacherPayload);

			expect(result).toEqual([mockLessonOutput]);
			expect(service.findLessonsForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'findLessonsForPeriod').mockResolvedValue([mockLessonOutput] as any);

			await controller.findLessonsForPeriod('2024-01-01', '2024-01-31', '5', adminPayload);

			expect(service.findLessonsForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 5);
		});

		it('should use admin id when teacher_id not provided', async () => {
			jest.spyOn(service, 'findLessonsForPeriod').mockResolvedValue([]);

			await controller.findLessonsForPeriod('2024-01-01', '2024-01-31', undefined, adminPayload);

			expect(service.findLessonsForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 2);
		});
	});

	describe('findLessonsForPeriodAndStudent', () => {
		it('should delegate to service', async () => {
			const mockOutput = { id: 1, name: 'Student', class: 5, canceled_lessons: 0, missed_lessons: 0 };
			jest.spyOn(service, 'findLessonsForPeriodAndStudent').mockResolvedValue(mockOutput as any);

			const result = await controller.findLessonsForPeriodAndStudent('1', '2024-01-01', '2024-01-31', teacherPayload);

			expect(result).toEqual(mockOutput);
			expect(service.findLessonsForPeriodAndStudent).toHaveBeenCalledWith(1, '2024-01-01', '2024-01-31', teacherPayload);
		});
	});

	describe('findLessonsForReschedule', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'findLessonsForReschedule').mockResolvedValue([mockLessonOutput] as any);

			await controller.findLessonsForReschedule('5', teacherPayload);

			expect(service.findLessonsForReschedule).toHaveBeenCalledWith(1);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'findLessonsForReschedule').mockResolvedValue([]);

			await controller.findLessonsForReschedule('5', adminPayload);

			expect(service.findLessonsForReschedule).toHaveBeenCalledWith(5);
		});
	});

	describe('createSingleLessonByAdmin', () => {
		it('should delegate to service', async () => {
			const dto: SingleLessonInputDto = {
				plan_id: 1,
				student_id: 1,
				teacher_id: 1,
				start_date: new Date(),
				isFree: false,
				isTrial: false,
			};
			jest.spyOn(service, 'createSingleLessonByAdmin').mockResolvedValue(mockLessonOutput as any);

			const result = await controller.createSingleLessonByAdmin(dto);

			expect(result).toEqual(mockLessonOutput);
			expect(service.createSingleLessonByAdmin).toHaveBeenCalledWith(dto);
		});
	});

	describe('createRescheduledLesson', () => {
		it('should delegate to service', async () => {
			const dto: RescheduledLessonInputDto = {
				rescheduled_lesson_id: 1,
				teacher_id: 1,
				start_date: new Date(),
			};
			jest.spyOn(service, 'createRescheduledLesson').mockResolvedValue(mockLessonOutput as any);

			const result = await controller.createRescheduledLesson(dto, teacherPayload);

			expect(result).toEqual(mockLessonOutput);
			expect(service.createRescheduledLesson).toHaveBeenCalledWith(dto, teacherPayload);
		});
	});

	describe('createRegularLesson', () => {
		it('should delegate to service', async () => {
			const dto: RegularLessonsInputDto = {
				lessons: [{
					plan_id: 1,
					start_time: '2024-01-01T10:00:00.000Z',
					week_day: WeekDay.MONDAY,
					start_period_date: '2024-01-01',
					end_period_date: '2024-01-31',
					teacher_id: 1,
				}],
			};
			jest.spyOn(service, 'createRegularLessons').mockResolvedValue([]);

			await controller.createRegularLesson(dto, '1');

			expect(service.createRegularLessons).toHaveBeenCalledWith(dto, 1);
		});
	});

	describe('getRegularLessons', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'getRegularLessons').mockResolvedValue([]);

			await controller.getRegularLessons('1');

			expect(service.getRegularLessons).toHaveBeenCalledWith(1);
		});
	});

	describe('findLessonsByStartDate', () => {
		it('should use teacher id for non-admin', async () => {
			jest.spyOn(service, 'findLessonsByStartDate').mockResolvedValue([mockLessonOutput] as any);

			await controller.findLessonsByStartDate('2024-01-01', undefined, teacherPayload);

			expect(service.findLessonsByStartDate).toHaveBeenCalledWith(new Date('2024-01-01'), 1);
		});

		it('should use teacher_id query for admin when provided', async () => {
			jest.spyOn(service, 'findLessonsByStartDate').mockResolvedValue([]);

			await controller.findLessonsByStartDate('2024-01-01', '5', adminPayload);

			expect(service.findLessonsByStartDate).toHaveBeenCalledWith(new Date('2024-01-01'), 5);
		});
	});

	describe('changeTeacher', () => {
		it('should delegate to service', async () => {
			const dto: ChangeTeacherDto = { teacher_id: 2 };
			jest.spyOn(service, 'changeTeacher').mockResolvedValue(undefined);

			await controller.changeTeacher('1', dto);

			expect(service.changeTeacher).toHaveBeenCalledWith(1, dto);
		});
	});

	describe('cancelLesson', () => {
		it('should delegate to service', async () => {
			const dto: CancelLessonDto = { status: CancelationStatusEnum.MISSED, comment: 'test' };
			jest.spyOn(service, 'cancelLesson').mockResolvedValue(undefined);

			await controller.cancelLesson('1', dto, teacherPayload);

			expect(service.cancelLesson).toHaveBeenCalledWith(1, dto, teacherPayload);
		});
	});

	describe('manageFreeLessonStatus', () => {
		it('should delegate to service', async () => {
			const dto: ManageFreeLessonStatusDto = { isFree: true };
			jest.spyOn(service, 'manageFreeLessonStatus').mockResolvedValue(undefined);

			await controller.manageFreeLessonStatus('1', dto);

			expect(service.manageFreeLessonStatus).toHaveBeenCalledWith(1, dto);
		});
	});

	describe('deleteLesson', () => {
		it('should delegate to service', async () => {
			jest.spyOn(service, 'deleteLesson').mockResolvedValue(undefined);

			await controller.deleteLesson('1');

			expect(service.deleteLesson).toHaveBeenCalledWith(1);
		});
	});

	describe('updateLessonsPlanForPeriod', () => {
		it('should delegate to service', async () => {
			const dto: UpdateLessonsPlanForPeriodDto = {
				student_id: 1,
				new_plan_id: 2,
				old_plan_id: 1,
				start_date: new Date('2024-01-01'),
				end_date: new Date('2024-01-31'),
			};
			jest.spyOn(service, 'updateLessonsPlanForPeriod').mockResolvedValue(undefined);

			await controller.updateLessonsPlanForPeriod(dto);

			expect(service.updateLessonsPlanForPeriod).toHaveBeenCalledWith(dto);
		});
	});
});
