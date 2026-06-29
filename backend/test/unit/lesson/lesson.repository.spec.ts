import { Test, TestingModule } from '@nestjs/testing';
import { LessonRepository } from '../../../src/modules/lesson/infrastructure/lesson.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { LessonStatusEnum } from '../../../src/modules/lesson/interface/dto/lesson-status.enum';
import { CancelationStatusEnum, CancelLessonDto } from '../../../src/modules/lesson/interface/dto/requests/cancel-lesson.dto';
import { ManageFreeLessonStatusDto } from '../../../src/modules/lesson/interface/dto/requests/manage-free-lesson.input.dto';

describe('LessonRepository', () => {
	let repository: LessonRepository;
	let prisma: PrismaService;

	const mockStudent = {
		id: 1,
		name: 'Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
		teacher_id: 1,
		balance: 0,
		timezone: 'BY',
	};

	const mockTeacher = {
		id: 1,
		name: 'Teacher',
		login: 'teacher',
		role: 'TEACHER',
		timezone: 'BY',
	};

	const mockPlan = {
		id: 1,
		plan_name: 'Test Plan',
		plan_price: 100000,
		plan_currency: 'USD',
		duration: 10,
		plan_type: 'INDIVIDUAL',
		deleted_at: null,
		created_at: new Date(),
	};

	const mockLesson = {
		id: 1,
		student_id: 1,
		teacher_id: 1,
		plan_id: 1,
		date: new Date(),
		is_free: false,
		is_regular: false,
		is_trial: false,
		status: 'PENDING_UNPAID',
		student: mockStudent,
		teacher: mockTeacher,
		plan: mockPlan,
		rescheduled_lesson_id: null,
		rescheduled_to_lesson_id: null,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LessonRepository,
				{
					provide: PrismaService,
					useValue: {
						lesson: {
							findMany: jest.fn(),
							findUnique: jest.fn(),
							create: jest.fn(),
							update: jest.fn(),
							delete: jest.fn(),
							updateMany: jest.fn(),
						},
						$transaction: jest.fn(),
					},
				},
			],
		}).compile();

		repository = module.get<LessonRepository>(LessonRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('findLessonsForReschedule', () => {
		it('should return rescheduled lessons', async () => {
			jest.spyOn(prisma.lesson, 'findMany').mockResolvedValue([mockLesson] as any);

			const result = await repository.findLessonsForReschedule(1);

			expect(result).toHaveLength(1);
			expect(prisma.lesson.findMany).toHaveBeenCalled();
		});
	});

	describe('findLessonsForPeriodAndStudent', () => {
		it('should return lessons for student in period', async () => {
			jest.spyOn(prisma.lesson, 'findMany').mockResolvedValue([mockLesson] as any);

			const result = await repository.findLessonsForPeriodAndStudent(1, '2024-01-01', '2024-01-31');

			expect(result).toHaveLength(1);
		});
	});

	describe('findLessonsByStartDate', () => {
		it('should return lessons by start date', async () => {
			jest.spyOn(prisma.lesson, 'findMany').mockResolvedValue([mockLesson] as any);

			const result = await repository.findLessonsByStartDate(new Date('2024-01-01'), 1);

			expect(result).toHaveLength(1);
		});
	});

	describe('createSingleLesson', () => {
		it('should create single lesson', async () => {
			jest.spyOn(prisma.lesson, 'create').mockResolvedValue(mockLesson as any);

			const result = await repository.createSingleLesson(mockLesson as any);

			expect(result.id).toBe(1);
		});

		it('should throw BadRequestException on create failure', async () => {
			jest.spyOn(prisma.lesson, 'create').mockRejectedValue(new Error('DB error'));
			jest.spyOn(console, 'log').mockImplementation(() => {});

			await expect(repository.createSingleLesson(mockLesson as any)).rejects.toThrow(BadRequestException);
		});
	});

	describe('updateRescheduledLesson', () => {
		it('should update rescheduled lesson link', async () => {
			jest.spyOn(prisma.lesson, 'update').mockResolvedValue(mockLesson as any);

			await repository.updateRescheduledLesson(1, { id: 2, date: new Date() } as any);

			expect(prisma.lesson.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { rescheduled_to_lesson_id: 2, rescheduled_to_lesson_date: expect.any(Date) },
			});
		});
	});

	describe('findById', () => {
		it('should return lesson by id', async () => {
			jest.spyOn(prisma.lesson, 'findUnique').mockResolvedValue(mockLesson as any);

			const result = await repository.findById(1);

			expect(result?.id).toBe(1);
		});

		it('should return null when not found', async () => {
			jest.spyOn(prisma.lesson, 'findUnique').mockResolvedValue(null);

			const result = await repository.findById(999);

			expect(result).toBeNull();
		});
	});

	describe('cancelLesson', () => {
		it('should cancel lesson with cancelled status', async () => {
			const dto: CancelLessonDto = { status: CancelationStatusEnum.CANCELLED, comment: 'test' };
			jest.spyOn(prisma.lesson, 'update').mockResolvedValue(mockLesson as any);

			await repository.cancelLesson(1, dto, null);

			expect(prisma.lesson.update).toHaveBeenCalled();
		});
	});

	describe('deleteLesson', () => {
		it('should delete lesson', async () => {
			jest.spyOn(prisma.lesson, 'findUnique').mockResolvedValue(mockLesson as any);
			jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback({
				lesson: {
					update: jest.fn().mockResolvedValue(undefined),
					delete: jest.fn().mockResolvedValue(mockLesson),
				},
			}));

			await repository.deleteLesson(1);

			expect(prisma.$transaction).toHaveBeenCalled();
		});
	});

	describe('manageFreeLessonStatus', () => {
		it('should update free lesson status', async () => {
			const dto: ManageFreeLessonStatusDto = { isFree: true };
			jest.spyOn(prisma.lesson, 'update').mockResolvedValue({ ...mockLesson, is_free: true } as any);

			await repository.manageFreeLessonStatus(1, dto);

			expect(prisma.lesson.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { is_free: true },
			});
		});
	});

	describe('updatePendingLessonsStatus', () => {
		it('should update pending lessons to completed unpaid', async () => {
			jest.spyOn(prisma.lesson, 'updateMany').mockResolvedValue({ count: 3 });

			await repository.updatePendingLessonsStatus();

			expect(prisma.lesson.updateMany).toHaveBeenCalled();
		});
	});
});
