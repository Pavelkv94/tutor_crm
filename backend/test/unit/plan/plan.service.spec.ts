import { Test, TestingModule } from '@nestjs/testing';
import { PlanService } from '../../../src/modules/plan/plan.service';
import { PlanRepository } from '../../../src/modules/plan/plan.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePlanInputDto, PlanTypeEnum } from '../../../src/modules/plan/dto/create-plan.input.dto';
import { FilterPlanQuery } from '../../../src/modules/plan/dto/filter.query.dto';

describe('PlanService', () => {
	let service: PlanService;
	let repository: PlanRepository;

	const mockPlan = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD' as any,
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan',
		deleted_at: null,
		created_at: new Date(),
	};

	const mockPlanOutput = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: 'USD' as any,
		plan_price: 100000,
		duration: 10,
		plan_name: 'Test Plan',
		deleted_at: null,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PlanService,
				{
					provide: PlanRepository,
					useValue: {
						createPlan: jest.fn(),
						getPlans: jest.fn(),
						getPlanById: jest.fn(),
						deletePlan: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PlanService>(PlanService);
		repository = module.get<PlanRepository>(PlanRepository);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		const createPlanDto: CreatePlanInputDto = {
			plan_type: PlanTypeEnum.INDIVIDUAL,
			plan_currency: 'USD' as any,
			plan_price: 100000,
			duration: 10,
		};

		it('should create plan successfully', async () => {
			jest.spyOn(repository, 'createPlan').mockResolvedValue(mockPlanOutput as any);

			const result = await service.create(createPlanDto);

			expect(result).toEqual(mockPlanOutput);
			expect(repository.createPlan).toHaveBeenCalledWith(createPlanDto);
		});
	});

	describe('findAll', () => {
		it('should return all plans', async () => {
			const filter = FilterPlanQuery.ALL;
			const mockPlans = [mockPlanOutput];

			jest.spyOn(repository, 'getPlans').mockResolvedValue(mockPlans as any);

			const result = await service.findAll(filter);

			expect(result).toEqual(mockPlans);
			expect(repository.getPlans).toHaveBeenCalledWith(filter);
		});
	});

	describe('findById', () => {
		it('should return plan by id', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(mockPlanOutput as any);

			const result = await service.findById(1);

			expect(result).toEqual(mockPlanOutput);
			expect(repository.getPlanById).toHaveBeenCalledWith(1);
		});

		it('should return null if plan not found', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(null);

			const result = await service.findById(1);

			expect(result).toBeNull();
		});
	});

	describe('remove', () => {
		it('should delete plan successfully', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(mockPlanOutput as any);
			jest.spyOn(repository, 'deletePlan').mockResolvedValue(true);

			const result = await service.remove(1);

			expect(result).toBe(true);
			expect(repository.getPlanById).toHaveBeenCalledWith(1);
			expect(repository.deletePlan).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if plan not found', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(null);

			await expect(service.remove(1)).rejects.toThrow(NotFoundException);
			await expect(service.remove(1)).rejects.toThrow('План не найден');
		});

		it('should throw BadRequestException if plan is deleted', async () => {
			const deletedPlan = {
				...mockPlanOutput,
				deleted_at: new Date(),
			};
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(deletedPlan as any);

			await expect(service.remove(1)).rejects.toThrow(BadRequestException);
			await expect(service.remove(1)).rejects.toThrow('План уже удален');
		});
	});
});

