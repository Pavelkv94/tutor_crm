import { Test, TestingModule } from '@nestjs/testing';
import { LessonService } from '../../../src/modules/lesson/lesson.service';
import { LessonRepository } from '../../../src/modules/lesson/lesson.repository';
import { PlanService } from '../../../src/modules/plan/plan.service';
import { StudentService } from '../../../src/modules/student/student.service';
import { TeacherService } from '../../../src/modules/teacher/teacher.service';
import { LessonRegularRepository } from '../../../src/modules/lesson/lesson-regular.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SingleLessonInputDto } from '../../../src/modules/lesson/dto/single-lesson.input.dto';
import { RegularLessonsInputDto, WeekDay } from '../../../src/modules/lesson/dto/regular-lesson.input.dto';
import { ChangeTeacherDto } from '../../../src/modules/lesson/dto/change-teacher.dto';
import { CancelLessonDto, CancelationStatusEnum } from '../../../src/modules/lesson/dto/cancel-lesson.dto';
import { PlanTypeEnum } from '../../../src/modules/plan/dto/create-plan.input.dto';
import { LessonStatusEnum } from '../../../src/modules/lesson/dto/lesson-status.enum';
import { TeacherRoleEnum } from '../../../src/modules/teacher/dto/teacherRole';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';

describe('LessonService', () => {
	let service: LessonService;
	let lessonRepository: LessonRepository;
	let planService: PlanService;
	let studentService: StudentService;
	let teacherService: TeacherService;
	let lessonRegularRepository: LessonRegularRepository;

	const mockPlan = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD',
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan',
		deleted_at: null,
		created_at: new Date(),
	};

	const mockStudent = {
		id: 1,
		name: 'Test Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
		teacher_id: 1,
		balance: 0,
		bookUntilCancellation: false,
		notifyAboutBirthday: false,
		notifyAboutLessons: false,
		deleted_at: null,
	};

	const mockTeacher = {
		id: 1,
		login: 'testteacher',
		name: 'Test Teacher',
		role: 'TEACHER',
		telegram_id: null,
		deleted_at: null,
	};

	const mockLesson = {
		id: 1,
		student_id: 1,
		teacher_id: 1,
		plan_id: 1,
		date: new Date(),
		is_free: false,
		is_regular: false,
		status: LessonStatusEnum.PENDING_UNPAID,
		student: mockStudent,
		plan: mockPlan,
	};

	const mockLessonOutput = {
		id: 1,
		student_id: 1,
		teacher_id: 1,
		plan_id: 1,
		date: new Date(),
		is_free: false,
		is_regular: false,
		status: LessonStatusEnum.PENDING_UNPAID,
		student: mockStudent,
		plan: mockPlan,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LessonService,
				{
					provide: LessonRepository,
					useValue: {
						findExistingLessonsByDate: jest.fn(),
						createSingleLesson: jest.fn(),
						findLessonsForPeriod: jest.fn(),
						findLessonsByStartDate: jest.fn(),
						createRegularLesson: jest.fn(),
						changeTeacher: jest.fn(),
						findById: jest.fn(),
						cancelLesson: jest.fn(),
						updatePendingLessonsStatus: jest.fn(),
					},
				},
				{
					provide: PlanService,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: StudentService,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: TeacherService,
					useValue: {
						getTeacherById: jest.fn(),
					},
				},
				{
					provide: LessonRegularRepository,
					useValue: {
						createRegularLesson: jest.fn(),
						deleteRegularLesson: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<LessonService>(LessonService);
		lessonRepository = module.get<LessonRepository>(LessonRepository);
		planService = module.get<PlanService>(PlanService);
		studentService = module.get<StudentService>(StudentService);
		teacherService = module.get<TeacherService>(TeacherService);
		lessonRegularRepository = module.get<LessonRegularRepository>(LessonRegularRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('createSingleLessonByAdmin', () => {
		const singleLessonDto: SingleLessonInputDto = {
			plan_id: 1,
			student_id: 1,
			teacher_id: 1,
			start_date: new Date(),
			isFree: false,
			isTrial: false,
		};

		it('should create single lesson successfully', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDate').mockResolvedValue([]);
			jest.spyOn(lessonRepository, 'createSingleLesson').mockResolvedValue(mockLessonOutput as any);

			const result = await service.createSingleLessonByAdmin(singleLessonDto);

			expect(result).toEqual(mockLessonOutput);
			expect(planService.findById).toHaveBeenCalledWith(singleLessonDto.plan_id);
			expect(studentService.findById).toHaveBeenCalledWith(singleLessonDto.student_id);
			expect(lessonRepository.findExistingLessonsByDate).toHaveBeenCalled();
			expect(lessonRepository.createSingleLesson).toHaveBeenCalled();
		});

		it('should throw NotFoundException if plan not found', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(null);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(NotFoundException);
			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow('План не найден');
		});

		it('should throw BadRequestException if plan is deleted', async () => {
			const deletedPlan = { ...mockPlan, deleted_at: new Date() };
			jest.spyOn(planService, 'findById').mockResolvedValue(deletedPlan as any);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow('План уже удален');
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(NotFoundException);
			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow('Студент не найден');
		});

		it('should throw BadRequestException if too many lessons at same time', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDate').mockResolvedValue([
				mockLesson as any,
				mockLesson as any,
			]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if individual lesson already exists at same time', async () => {
			const existingLesson = {
				...mockLesson,
				plan: { ...mockPlan, plan_type: PlanTypeEnum.INDIVIDUAL },
			};
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDate').mockResolvedValue([existingLesson as any]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if same student already has lesson at same time', async () => {
			const existingLesson = {
				...mockLesson,
				student: { ...mockStudent, id: 1 },
			};
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDate').mockResolvedValue([existingLesson as any]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if plan_id does not match existing lesson', async () => {
			const existingLesson = {
				...mockLesson,
				plan_id: 2,
			};
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDate').mockResolvedValue([existingLesson as any]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});
	});

	describe('findLessonsForPeriod', () => {
		it('should return lessons for period', async () => {
			const startDate = '2024-01-01';
			const endDate = '2024-01-31';
			const teacherId = 1;
			const mockLessons = [mockLessonOutput];

			jest.spyOn(lessonRepository, 'findLessonsForPeriod').mockResolvedValue(mockLessons as any);

			const result = await service.findLessonsForPeriod(startDate, endDate, teacherId);

			expect(result).toEqual(mockLessons);
			expect(lessonRepository.findLessonsForPeriod).toHaveBeenCalledWith(startDate, endDate, teacherId);
		});
	});

	describe('findLessonsByStartDate', () => {
		it('should return lessons by start date', async () => {
			const startDate = new Date();
			const teacherId = 1;
			const mockLessons = [mockLessonOutput];

			jest.spyOn(lessonRepository, 'findLessonsByStartDate').mockResolvedValue(mockLessons as any);

			const result = await service.findLessonsByStartDate(startDate, teacherId);

			expect(result).toEqual(mockLessons);
			expect(lessonRepository.findLessonsByStartDate).toHaveBeenCalledWith(startDate, teacherId);
		});
	});

	describe('changeTeacher', () => {
		const changeTeacherDto: ChangeTeacherDto = {
			teacher_id: 2,
		};

		it('should change teacher successfully', async () => {
			const newTeacher = { ...mockTeacher, id: 2 };
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(newTeacher as any);
			jest.spyOn(lessonRepository, 'changeTeacher').mockResolvedValue(undefined);

			await service.changeTeacher(1, changeTeacherDto);

			expect(teacherService.getTeacherById).toHaveBeenCalledWith(changeTeacherDto.teacher_id);
			expect(lessonRepository.changeTeacher).toHaveBeenCalledWith(1, changeTeacherDto.teacher_id);
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.changeTeacher(1, changeTeacherDto)).rejects.toThrow(NotFoundException);
			await expect(service.changeTeacher(1, changeTeacherDto)).rejects.toThrow('Преподаватель не найден');
		});

		it('should throw BadRequestException if teacher is deleted', async () => {
			const deletedTeacher = { ...mockTeacher, deleted_at: new Date() };
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(deletedTeacher as any);

			await expect(service.changeTeacher(1, changeTeacherDto)).rejects.toThrow(BadRequestException);
			await expect(service.changeTeacher(1, changeTeacherDto)).rejects.toThrow('Преподаватель удален');
		});
	});

	describe('cancelLesson', () => {
		const cancelLessonDto: CancelLessonDto = {
			status: CancelationStatusEnum.CANCELLED,
			comment: 'Test cancellation',
		};

		const teacherPayload: JwtPayloadDto = {
			id: '1',
			login: 'testteacher',
			name: 'Test Teacher',
			role: TeacherRoleEnum.TEACHER,
		};

		it('should cancel lesson successfully', async () => {
			const mockLessonWithRescheduled = { ...mockLesson, rescheduled_lesson_id: null };
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(mockLessonWithRescheduled as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(lessonRepository, 'cancelLesson').mockResolvedValue(undefined);

			await service.cancelLesson(1, cancelLessonDto, teacherPayload);

			expect(lessonRepository.findById).toHaveBeenCalledWith(1);
			expect(lessonRepository.cancelLesson).toHaveBeenCalledWith(1, cancelLessonDto, null);
		});

		it('should throw NotFoundException if lesson not found', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(null);

			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow(NotFoundException);
			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow('Урок не найден');
		});

		it('should throw BadRequestException if lesson already cancelled', async () => {
			const cancelledLesson = {
				...mockLesson,
				status: LessonStatusEnum.CANCELLED,
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(cancelledLesson as any);

			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow('Урок уже отменен');
		});

		it('should throw BadRequestException if teacher tries to cancel lesson for another teacher\'s student', async () => {
			const lessonWithDifferentTeacher = {
				...mockLesson,
				student: { ...mockStudent, teacher_id: 2 },
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonWithDifferentTeacher as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);

			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow('Вы не можете отменить этот урок');
		});

		it('should allow admin to cancel any lesson', async () => {
			const adminPayload: JwtPayloadDto = {
				id: '1',
				login: 'admin',
				name: 'Admin',
				role: TeacherRoleEnum.ADMIN,
			};
			const lessonWithDifferentTeacher = {
				...mockLesson,
				student: { ...mockStudent, teacher_id: 2 },
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonWithDifferentTeacher as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(lessonRepository, 'cancelLesson').mockResolvedValue(undefined);

			await service.cancelLesson(1, cancelLessonDto, adminPayload);

			expect(lessonRepository.cancelLesson).toHaveBeenCalled();
		});
	});
});

