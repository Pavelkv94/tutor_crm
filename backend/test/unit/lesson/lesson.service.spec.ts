import { Test, TestingModule } from '@nestjs/testing';
import { LessonService } from '../../../src/modules/lesson/application/lesson.service';
import { LessonRepository } from '../../../src/modules/lesson/infrastructure/lesson.repository';
import { PlanService } from '../../../src/modules/plan/application/plan.service';
import { StudentService } from '../../../src/modules/student/application/student.service';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { LessonRegularRepository } from '../../../src/modules/lesson/infrastructure/lesson-regular.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SingleLessonInputDto } from '../../../src/modules/lesson/interface/dto/requests/single-lesson.input.dto';
import { RegularLessonsInputDto, WeekDay } from '../../../src/modules/lesson/interface/dto/requests/regular-lesson.input.dto';
import { ChangeTeacherDto } from '../../../src/modules/lesson/interface/dto/requests/change-teacher.dto';
import { CancelLessonDto, CancelationStatusEnum } from '../../../src/modules/lesson/interface/dto/requests/cancel-lesson.dto';
import { PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';
import { LessonStatusEnum } from '../../../src/modules/lesson/interface/dto/lesson-status.enum';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { RescheduledLessonInputDto } from '../../../src/modules/lesson/interface/dto/requests/rescheduled-lesson.input.dto';
import { ManageFreeLessonStatusDto } from '../../../src/modules/lesson/interface/dto/requests/manage-free-lesson.input.dto';
import { UpdateLessonsPlanForPeriodDto } from '../../../src/modules/lesson/interface/dto/requests/update-lesson-plan.input.dto';

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
						findExistingLessonsByDateAndTeacher: jest.fn(),
						createSingleLesson: jest.fn(),
						findLessonsForPeriod: jest.fn(),
						findLessonsForPeriodForSalary: jest.fn(),
						findLessonsByStartDate: jest.fn(),
						findLessonsForReschedule: jest.fn(),
						findLessonsForPeriodAndStudent: jest.fn(),
						createRegularLesson: jest.fn(),
						changeTeacher: jest.fn(),
						findById: jest.fn(),
						cancelLesson: jest.fn(),
						updatePendingLessonsStatus: jest.fn(),
						updateRescheduledLesson: jest.fn(),
						updateLessonsPlanForPeriod: jest.fn(),
						deleteLesson: jest.fn(),
						manageFreeLessonStatus: jest.fn(),
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
						getRegularLessons: jest.fn(),
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
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([]);
			jest.spyOn(lessonRepository, 'createSingleLesson').mockResolvedValue(mockLessonOutput as any);

			const result = await service.createSingleLessonByAdmin(singleLessonDto);

			expect(result).toEqual(mockLessonOutput);
			expect(planService.findById).toHaveBeenCalledWith(singleLessonDto.plan_id);
			expect(studentService.findById).toHaveBeenCalledWith(singleLessonDto.student_id);
			expect(lessonRepository.findExistingLessonsByDateAndTeacher).toHaveBeenCalled();
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
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([
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
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([existingLesson as any]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if same student already has lesson at same time', async () => {
			const existingLesson = {
				...mockLesson,
				student: { ...mockStudent, id: 1 },
			};
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([existingLesson as any]);

			await expect(service.createSingleLessonByAdmin(singleLessonDto)).rejects.toThrow(BadRequestException);
		});

		it('should throw BadRequestException if plan_id does not match existing lesson', async () => {
			const existingLesson = {
				...mockLesson,
				plan_id: 2,
			};
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([existingLesson as any]);

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

		const missedLessonDto: CancelLessonDto = {
			status: CancelationStatusEnum.MISSED,
			comment: 'Test missed lesson',
		};

		const teacherPayload: JwtPayloadDto = {
			id: '1',
			login: 'testteacher',
			name: 'Test Teacher',
			role: TeacherRoleEnum.TEACHER,
		};

		const adminPayload: JwtPayloadDto = {
			id: '1',
			login: 'admin',
			name: 'Admin',
			role: TeacherRoleEnum.ADMIN,
		};

		it('should cancel lesson successfully for teacher with missed status', async () => {
			const mockLessonWithRescheduled = { ...mockLesson, rescheduled_lesson_id: null };
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(mockLessonWithRescheduled as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(lessonRepository, 'cancelLesson').mockResolvedValue(undefined);

			await service.cancelLesson(1, missedLessonDto, teacherPayload);

			expect(lessonRepository.findById).toHaveBeenCalledWith(1);
			expect(lessonRepository.cancelLesson).toHaveBeenCalledWith(1, missedLessonDto, null);
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
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);

			await expect(service.cancelLesson(1, cancelLessonDto, adminPayload)).rejects.toThrow(BadRequestException);
			await expect(service.cancelLesson(1, cancelLessonDto, adminPayload)).rejects.toThrow('Урок уже отменен');
		});

		it('should throw BadRequestException if teacher tries to cancel lesson for another teacher\'s student', async () => {
			const lessonWithDifferentTeacher = {
				...mockLesson,
				student: { ...mockStudent, teacher_id: 2 },
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonWithDifferentTeacher as any);
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);

			await expect(service.cancelLesson(1, missedLessonDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.cancelLesson(1, missedLessonDto, teacherPayload)).rejects.toThrow('Вы не можете отменить этот урок');
		});

		it('should throw BadRequestException if teacher tries to cancel lesson with cancelled status', async () => {
			const mockLessonWithRescheduled = { ...mockLesson, rescheduled_lesson_id: null };
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(mockLessonWithRescheduled as any);

			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.cancelLesson(1, cancelLessonDto, teacherPayload)).rejects.toThrow('Вы не можете отменить этот урок');
		});

		it('should allow admin to cancel any lesson', async () => {
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

	describe('createRescheduledLesson', () => {
		const rescheduledDto: RescheduledLessonInputDto = {
			rescheduled_lesson_id: 1,
			teacher_id: 1,
			start_date: new Date('2024-02-01T10:00:00.000Z'),
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

		it('should create rescheduled lesson successfully', async () => {
			const lessonToReschedule = {
				...mockLesson,
				is_trial: false,
				student: { ...mockStudent, teacher_id: 1 },
				teacher: { id: 1 },
				plan: mockPlan,
				rescheduled_lesson_id: null,
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonToReschedule as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([]);
			jest.spyOn(lessonRepository, 'createSingleLesson').mockResolvedValue(mockLessonOutput as any);
			jest.spyOn(lessonRepository, 'updateRescheduledLesson').mockResolvedValue(undefined);

			const result = await service.createRescheduledLesson(rescheduledDto, teacherPayload);

			expect(result).toEqual(mockLessonOutput);
			expect(lessonRepository.updateRescheduledLesson).toHaveBeenCalled();
		});

		it('should throw BadRequestException if teacher_id not provided', async () => {
			const dtoWithoutTeacher = { ...rescheduledDto, teacher_id: undefined };

			await expect(service.createRescheduledLesson(dtoWithoutTeacher, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.createRescheduledLesson(dtoWithoutTeacher, teacherPayload)).rejects.toThrow('Преподаватель не указан');
		});

		it('should throw NotFoundException if lesson not found', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(null);

			await expect(service.createRescheduledLesson(rescheduledDto, teacherPayload)).rejects.toThrow(NotFoundException);
		});

		it('should throw BadRequestException if trial lesson', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue({ ...mockLesson, is_trial: true } as any);

			await expect(service.createRescheduledLesson(rescheduledDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.createRescheduledLesson(rescheduledDto, teacherPayload)).rejects.toThrow('Пробное занятие не может быть перенесено');
		});

		it('should throw BadRequestException if teacher tries to reschedule another teacher student lesson', async () => {
			const lessonWithDifferentTeacher = {
				...mockLesson,
				is_trial: false,
				student: { ...mockStudent, teacher_id: 2 },
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonWithDifferentTeacher as any);

			await expect(service.createRescheduledLesson(rescheduledDto, teacherPayload)).rejects.toThrow(BadRequestException);
			await expect(service.createRescheduledLesson(rescheduledDto, teacherPayload)).rejects.toThrow('Вы не можете перенести это занятие');
		});

		it('should allow admin to reschedule any lesson', async () => {
			const lessonWithDifferentTeacher = {
				...mockLesson,
				is_trial: false,
				student: { ...mockStudent, teacher_id: 2 },
				teacher: { id: 1 },
				plan: mockPlan,
			};
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(lessonWithDifferentTeacher as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([]);
			jest.spyOn(lessonRepository, 'createSingleLesson').mockResolvedValue(mockLessonOutput as any);
			jest.spyOn(lessonRepository, 'updateRescheduledLesson').mockResolvedValue(undefined);

			await service.createRescheduledLesson(rescheduledDto, adminPayload);

			expect(lessonRepository.createSingleLesson).toHaveBeenCalled();
		});
	});

	describe('updateLessonsPlanForPeriod', () => {
		const dto: UpdateLessonsPlanForPeriodDto = {
			student_id: 1,
			new_plan_id: 2,
			old_plan_id: 1,
			start_date: new Date('2024-01-01'),
			end_date: new Date('2024-01-31'),
		};

		it('should update lessons plan successfully', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(lessonRepository, 'updateLessonsPlanForPeriod').mockResolvedValue(undefined);

			await service.updateLessonsPlanForPeriod(dto);

			expect(lessonRepository.updateLessonsPlanForPeriod).toHaveBeenCalledWith(dto);
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.updateLessonsPlanForPeriod(dto)).rejects.toThrow(NotFoundException);
		});

		it('should throw NotFoundException if plan not found', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(planService, 'findById').mockResolvedValue(null);

			await expect(service.updateLessonsPlanForPeriod(dto)).rejects.toThrow(NotFoundException);
		});

		it('should throw BadRequestException if plan is deleted', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(planService, 'findById').mockResolvedValue({ ...mockPlan, deleted_at: new Date() } as any);

			await expect(service.updateLessonsPlanForPeriod(dto)).rejects.toThrow(BadRequestException);
		});
	});

	describe('findLessonsForPeriodAndStudent', () => {
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

		it('should return student lessons summary', async () => {
			const lessons = [
				{ ...mockLessonOutput, status: LessonStatusEnum.CANCELLED },
				{ ...mockLessonOutput, status: LessonStatusEnum.MISSED },
				{ ...mockLessonOutput, status: LessonStatusEnum.RESCHEDULED },
			];
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findLessonsForPeriodAndStudent').mockResolvedValue(lessons as any);

			const result = await service.findLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31', teacherPayload);

			expect(result).toEqual({
				id: mockStudent.id,
				name: mockStudent.name,
				class: mockStudent.class,
				canceled_lessons: 1,
				missed_lessons: 1,
				rescheduled_lessons: 1,
			});
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.findLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31', teacherPayload)).rejects.toThrow(NotFoundException);
		});

		it('should throw BadRequestException if teacher tries to access another teacher student', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue({ ...mockStudent, teacher_id: 2 } as any);

			await expect(service.findLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31', teacherPayload)).rejects.toThrow(BadRequestException);
		});

		it('should allow admin to access any student', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue({ ...mockStudent, teacher_id: 2 } as any);
			jest.spyOn(lessonRepository, 'findLessonsForPeriodAndStudent').mockResolvedValue([]);

			await service.findLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31', adminPayload);

			expect(lessonRepository.findLessonsForPeriodAndStudent).toHaveBeenCalled();
		});
	});

	describe('findPendingUnpaidLessonsForPeriodAndStudent', () => {
		const teacherPayload: JwtPayloadDto = {
			id: '1',
			login: 'teacher',
			name: 'Teacher',
			role: TeacherRoleEnum.TEACHER,
		};

		it('should return pending unpaid non-trial lessons', async () => {
			const lessons = [
				{ ...mockLessonOutput, status: LessonStatusEnum.PENDING_UNPAID, is_trial: false },
				{ ...mockLessonOutput, status: LessonStatusEnum.PENDING_UNPAID, is_trial: true },
				{ ...mockLessonOutput, status: LessonStatusEnum.COMPLETED_PAID, is_trial: false },
			];
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRepository, 'findLessonsForPeriodAndStudent').mockResolvedValue(lessons as any);

			const result = await service.findPendingUnpaidLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31', teacherPayload);

			expect(result).toHaveLength(1);
			expect(result[0].status).toBe(LessonStatusEnum.PENDING_UNPAID);
		});
	});

	describe('createRegularLessons', () => {
		const regularLessonsDto: RegularLessonsInputDto = {
			lessons: [{
				plan_id: 1,
				start_time: '2024-01-01T10:00:00.000Z',
				week_day: WeekDay.MONDAY,
				start_period_date: '2024-01-01T00:00:00.000Z',
				end_period_date: '2024-01-15T00:00:00.000Z',
				teacher_id: 1,
			}],
		};

		const mockRegularLesson = { id: 1, week_day: WeekDay.MONDAY };

		it('should create regular lessons successfully', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(lessonRegularRepository, 'createRegularLesson').mockResolvedValue(mockRegularLesson as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([]);
			jest.spyOn(lessonRepository, 'createRegularLesson').mockResolvedValue(undefined);

			const result = await service.createRegularLessons(regularLessonsDto, 1);

			expect(result).toEqual([mockRegularLesson]);
			expect(lessonRegularRepository.createRegularLesson).toHaveBeenCalled();
		});

		it('should throw NotFoundException if plan not found', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(null);

			await expect(service.createRegularLessons(regularLessonsDto, 1)).rejects.toThrow(NotFoundException);
		});

		it('should rollback regular lesson on conflict', async () => {
			jest.spyOn(planService, 'findById').mockResolvedValue(mockPlan);
			jest.spyOn(lessonRegularRepository, 'createRegularLesson').mockResolvedValue(mockRegularLesson as any);
			jest.spyOn(lessonRepository, 'findExistingLessonsByDateAndTeacher').mockResolvedValue([
				{ ...mockLesson, student: { ...mockStudent, id: 1 } },
			] as any);
			jest.spyOn(lessonRegularRepository, 'deleteRegularLesson').mockResolvedValue(undefined);

			await expect(service.createRegularLessons(regularLessonsDto, 1)).rejects.toThrow(BadRequestException);
			expect(lessonRegularRepository.deleteRegularLesson).toHaveBeenCalledWith(mockRegularLesson.id);
		});
	});

	describe('getRegularLessons', () => {
		it('should return regular lessons for student', async () => {
			const mockRegularLessons = [{ id: 1, week_day: WeekDay.MONDAY }];
			jest.spyOn(studentService, 'findById').mockResolvedValue(mockStudent as any);
			jest.spyOn(lessonRegularRepository, 'getRegularLessons').mockResolvedValue(mockRegularLessons as any);

			const result = await service.getRegularLessons(1);

			expect(result).toEqual(mockRegularLessons);
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(studentService, 'findById').mockResolvedValue(null as any);

			await expect(service.getRegularLessons(1)).rejects.toThrow(NotFoundException);
		});
	});

	describe('deleteLesson', () => {
		it('should delete lesson successfully', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(mockLesson as any);
			jest.spyOn(lessonRepository, 'deleteLesson').mockResolvedValue(undefined);

			await service.deleteLesson(1);

			expect(lessonRepository.deleteLesson).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if lesson not found', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue(null);

			await expect(service.deleteLesson(1)).rejects.toThrow(NotFoundException);
		});
	});

	describe('manageFreeLessonStatus', () => {
		const dto: ManageFreeLessonStatusDto = { isFree: true };

		it('should manage free lesson status successfully', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue({ ...mockLesson, is_trial: false } as any);
			jest.spyOn(lessonRepository, 'manageFreeLessonStatus').mockResolvedValue(undefined);

			await service.manageFreeLessonStatus(1, dto);

			expect(lessonRepository.manageFreeLessonStatus).toHaveBeenCalledWith(1, dto);
		});

		it('should throw BadRequestException for trial lesson', async () => {
			jest.spyOn(lessonRepository, 'findById').mockResolvedValue({ ...mockLesson, is_trial: true } as any);

			await expect(service.manageFreeLessonStatus(1, dto)).rejects.toThrow(BadRequestException);
			await expect(service.manageFreeLessonStatus(1, dto)).rejects.toThrow('Пробное занятие не может быть изменено');
		});
	});

	describe('findLessonsForReschedule', () => {
		it('should delegate to repository', async () => {
			jest.spyOn(lessonRepository, 'findLessonsForReschedule').mockResolvedValue([mockLessonOutput] as any);

			const result = await service.findLessonsForReschedule(1);

			expect(result).toEqual([mockLessonOutput]);
			expect(lessonRepository.findLessonsForReschedule).toHaveBeenCalledWith(1);
		});
	});

	describe('findLessonsForPeriodForSalary', () => {
		it('should delegate to repository', async () => {
			jest.spyOn(lessonRepository, 'findLessonsForPeriodForSalary').mockResolvedValue([mockLessonOutput] as any);

			const result = await service.findLessonsForPeriodForSalary('2024-01-01', '2024-01-31', 1);

			expect(result).toEqual([mockLessonOutput]);
			expect(lessonRepository.findLessonsForPeriodForSalary).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 1);
		});
	});

	describe('updateLessonsStatus', () => {
		it('should update pending lessons status', async () => {
			jest.spyOn(lessonRepository, 'updatePendingLessonsStatus').mockResolvedValue(undefined);

			await service.updateLessonsStatus();

			expect(lessonRepository.updatePendingLessonsStatus).toHaveBeenCalled();
		});
	});
});

