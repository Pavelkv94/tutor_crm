import { Test, TestingModule } from '@nestjs/testing';
import { PlanQueryRepository } from '../../../src/modules/plan/infrastructure/plan.query.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { FilterPlanQuery } from '../../../src/modules/plan/interface/dto/requests/filter.query.dto';
import { PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';

describe('PlanQueryRepository', () => {
	let repository: PlanQueryRepository;
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

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PlanQueryRepository,
				{
					provide: PrismaService,
					useValue: {
						plan: {
							findMany: jest.fn(),
							findUnique: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<PlanQueryRepository>(PlanQueryRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('getPlans', () => {
		it('should return all plans without filter', async () => {
			jest.spyOn(prisma.plan, 'findMany').mockResolvedValue([mockPlan] as any);

			const result = await repository.getPlans(FilterPlanQuery.ALL);

			expect(result).toHaveLength(1);
			expect(prisma.plan.findMany).toHaveBeenCalledWith({
				where: {},
				orderBy: [{ deleted_at: 'desc' }, { plan_name: 'asc' }],
			});
		});

		it('should filter active plans', async () => {
			jest.spyOn(prisma.plan, 'findMany').mockResolvedValue([mockPlan] as any);

			await repository.getPlans(FilterPlanQuery.ACTIVE);

			expect(prisma.plan.findMany).toHaveBeenCalledWith({
				where: { deleted_at: null },
				orderBy: [{ deleted_at: 'desc' }, { plan_name: 'asc' }],
			});
		});

		it('should filter deleted plans', async () => {
			jest.spyOn(prisma.plan, 'findMany').mockResolvedValue([]);

			await repository.getPlans(FilterPlanQuery.DELETED);

			expect(prisma.plan.findMany).toHaveBeenCalledWith({
				where: { deleted_at: { not: null } },
				orderBy: [{ deleted_at: 'desc' }, { plan_name: 'asc' }],
			});
		});
	});

	describe('getPlanById', () => {
		it('should return plan dto', async () => {
			jest.spyOn(prisma.plan, 'findUnique').mockResolvedValue(mockPlan as any);

			const result = await repository.getPlanById(1);

			expect(result).toEqual(expect.objectContaining({ id: 1 }));
		});

		it('should return null when not found', async () => {
			jest.spyOn(prisma.plan, 'findUnique').mockResolvedValue(null);

			const result = await repository.getPlanById(999);

			expect(result).toBeNull();
		});
	});
});
