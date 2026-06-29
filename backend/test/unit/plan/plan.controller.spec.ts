import { Test, TestingModule } from '@nestjs/testing';
import { PlanController } from '../../../src/modules/plan/interface/plan.controller';
import { PlanService } from '../../../src/modules/plan/application/plan.service';
import { PlanQueryRepositoryPort } from '../../../src/modules/plan/application/ports/plan.query.repository.port';
import { CreatePlanDto, PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';
import { FilterPlanQuery } from '../../../src/modules/plan/interface/dto/requests/filter.query.dto';

describe('PlanController', () => {
	let controller: PlanController;
	let planService: PlanService;
	let planQueryRepository: PlanQueryRepositoryPort;

	const mockPlanEntity = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD',
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan',
		deleted_at: null,
		created_at: new Date(),
	};

	const mockPlanDto = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD',
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan',
		deleted_at: null,
		created_at: mockPlanEntity.created_at,
	};

	const mockPlanService = {
		create: jest.fn(),
		remove: jest.fn(),
	};

	const mockPlanQueryRepository = {
		getPlans: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PlanController],
			providers: [
				{
					provide: PlanService,
					useValue: mockPlanService,
				},
				{
					provide: PlanQueryRepositoryPort,
					useValue: mockPlanQueryRepository,
				},
			],
		}).compile();

		controller = module.get<PlanController>(PlanController);
		planService = module.get<PlanService>(PlanService);
		planQueryRepository = module.get<PlanQueryRepositoryPort>(PlanQueryRepositoryPort);
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('create', () => {
		it('should create plan and map to response', async () => {
			const dto: CreatePlanDto = {
				plan_type: PlanTypeEnum.INDIVIDUAL,
				plan_currency: 'USD' as any,
				plan_price: 100000,
				duration: 10,
			};
			jest.spyOn(planService, 'create').mockResolvedValue(mockPlanEntity as any);

			const result = await controller.create(dto);

			expect(planService.create).toHaveBeenCalledWith(dto);
			expect(result).toEqual(mockPlanDto);
		});
	});

	describe('findAll', () => {
		it('should delegate to query repository', async () => {
			jest.spyOn(planQueryRepository, 'getPlans').mockResolvedValue([mockPlanDto] as any);

			const result = await controller.findAll(FilterPlanQuery.ALL);

			expect(result).toEqual([mockPlanDto]);
			expect(planQueryRepository.getPlans).toHaveBeenCalledWith(FilterPlanQuery.ALL);
		});
	});

	describe('remove', () => {
		it('should delegate to service', async () => {
			jest.spyOn(planService, 'remove').mockResolvedValue(true);

			const result = await controller.remove('1');

			expect(result).toBe(true);
			expect(planService.remove).toHaveBeenCalledWith(1);
		});
	});
});
