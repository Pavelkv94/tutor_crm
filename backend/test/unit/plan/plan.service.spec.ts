import { Test, TestingModule } from '@nestjs/testing';
import { PlanService } from '../../../src/modules/plan/application/plan.service';
import { PlanRepositoryPort } from '../../../src/modules/plan/application/ports/plan.repository.port';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePlanDto, PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';

describe('PlanService', () => {
	let service: PlanService;
	let repository: PlanRepositoryPort;

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
					provide: PlanRepositoryPort,
					useValue: {
						createPlan: jest.fn(),
						getPlanById: jest.fn(),
						deletePlan: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PlanService>(PlanService);
		repository = module.get<PlanRepositoryPort>(PlanRepositoryPort);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		const createPlanDto: CreatePlanDto = {
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
