import { Test, TestingModule } from '@nestjs/testing';
import { LessonRegularRepository } from '../../../src/modules/lesson/infrastructure/lesson-regular.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { RegularLessonInputDto, WeekDay } from '../../../src/modules/lesson/interface/dto/requests/regular-lesson.input.dto';
import { PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';

describe('LessonRegularRepository', () => {
	let repository: LessonRegularRepository;
	let prisma: PrismaService;

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

	const mockRegularLesson = {
		id: 1,
		student_id: 1,
		teacher_id: 1,
		start_time: '2024-01-01T10:00:00.000Z',
		week_day: WeekDay.MONDAY,
		start_period_date: new Date('2024-01-01'),
		end_period_date: new Date('2024-01-31'),
		plan: mockPlan,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LessonRegularRepository,
				{
					provide: PrismaService,
					useValue: {
						regularLesson: {
							create: jest.fn(),
							delete: jest.fn(),
							findMany: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<LessonRegularRepository>(LessonRegularRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('createRegularLesson', () => {
		it('should create regular lesson', async () => {
			const dto: RegularLessonInputDto = {
				plan_id: 1,
				start_time: '2024-01-01T10:00:00.000Z',
				week_day: WeekDay.MONDAY,
				start_period_date: '2024-01-01T00:00:00.000Z',
				end_period_date: '2024-01-31T00:00:00.000Z',
				teacher_id: 1,
			};
			jest.spyOn(prisma.regularLesson, 'create').mockResolvedValue(mockRegularLesson as any);

			const result = await repository.createRegularLesson(dto, 1);

			expect(result.id).toBe(1);
			expect(result.week_day).toBe(WeekDay.MONDAY);
			expect(prisma.regularLesson.create).toHaveBeenCalled();
		});
	});

	describe('deleteRegularLesson', () => {
		it('should delete regular lesson', async () => {
			jest.spyOn(prisma.regularLesson, 'delete').mockResolvedValue(mockRegularLesson as any);

			await repository.deleteRegularLesson(1);

			expect(prisma.regularLesson.delete).toHaveBeenCalledWith({ where: { id: 1 } });
		});
	});

	describe('getRegularLessons', () => {
		it('should return active regular lessons for student', async () => {
			jest.spyOn(prisma.regularLesson, 'findMany').mockResolvedValue([mockRegularLesson] as any);

			const result = await repository.getRegularLessons(1);

			expect(result).toHaveLength(1);
			expect(prisma.regularLesson.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ student_id: 1, deleted_at: null }),
				}),
			);
		});
	});
});
