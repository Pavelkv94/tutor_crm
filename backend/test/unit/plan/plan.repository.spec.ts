import { Test, TestingModule } from '@nestjs/testing';
import { PlanRepository } from '../../../src/modules/plan/infrastructure/plan.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { CreatePlanDto, PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';

describe('PlanRepository', () => {
	let repository: PlanRepository;
	let prisma: PrismaService;

	const mockPlan = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD',
		plan_price: 100000,
		duration: 10,
		plan_name: 'INDIVIDUAL 10 мин ',
		deleted_at: null,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PlanRepository,
				{
					provide: PrismaService,
					useValue: {
						plan: {
							create: jest.fn(),
							findUnique: jest.fn(),
							update: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<PlanRepository>(PlanRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('createPlan', () => {
		it('should create plan with generated name', async () => {
			const dto: CreatePlanDto = {
				plan_type: PlanTypeEnum.INDIVIDUAL,
				plan_currency: 'USD' as any,
				plan_price: 100000,
				duration: 10,
			};
			jest.spyOn(prisma.plan, 'create').mockResolvedValue(mockPlan as any);

			const result = await repository.createPlan(dto);

			expect(result.id).toBe(1);
			expect(prisma.plan.create).toHaveBeenCalled();
		});
	});

	describe('getPlanById', () => {
		it('should return plan entity', async () => {
			jest.spyOn(prisma.plan, 'findUnique').mockResolvedValue(mockPlan as any);

			const result = await repository.getPlanById(1);

			expect(result).toEqual(expect.objectContaining({ id: 1, plan_name: mockPlan.plan_name }));
		});

		it('should return null when not found', async () => {
			jest.spyOn(prisma.plan, 'findUnique').mockResolvedValue(null);

			const result = await repository.getPlanById(999);

			expect(result).toBeNull();
		});
	});

	describe('deletePlan', () => {
		it('should soft delete plan', async () => {
			jest.spyOn(prisma.plan, 'update').mockResolvedValue({ ...mockPlan, deleted_at: new Date() } as any);

			const result = await repository.deletePlan(1);

			expect(result).toBe(true);
			expect(prisma.plan.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { deleted_at: expect.any(Date) },
			});
		});
	});
});
