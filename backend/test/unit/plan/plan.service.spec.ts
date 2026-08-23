import { Test, TestingModule } from '@nestjs/testing';
import { PlanService } from '../../../src/modules/plan/application/plan.service';
import { PlanRepositoryPort } from '../../../src/modules/plan/application/ports/plan.repository.port';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePlanDto, PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';
import { StripeService } from '../../../src/infrastructure/stripe/stripe.service';
import { Currency } from '../../../src/shared/enums/currency.enum';

describe('PlanService', () => {
	let service: PlanService;
	let repository: PlanRepositoryPort;
	let stripeService: StripeService;

	const mockPlanOutput = {
		id: 1,
		plan_type: PlanTypeEnum.INDIVIDUAL,
		plan_currency: Currency.BYN,
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
						updateStripeIds: jest.fn(),
						setStripeProductId: jest.fn(),
					},
				},
				{
					provide: StripeService,
					useValue: {
						createProductWithPrice: jest.fn(),
						createProduct: jest.fn(),
						archiveProduct: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PlanService>(PlanService);
		repository = module.get<PlanRepositoryPort>(PlanRepositoryPort);
		stripeService = module.get<StripeService>(StripeService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		const createPlanDto: CreatePlanDto = {
			plan_type: PlanTypeEnum.INDIVIDUAL,
			plan_currency: Currency.BYN,
			plan_price: 100000,
			duration: 10,
		};

		it('should create plan successfully', async () => {
			jest.spyOn(repository, 'createPlan').mockResolvedValue(mockPlanOutput as any);

			const result = await service.create(createPlanDto);

			expect(result).toEqual(mockPlanOutput);
			expect(repository.createPlan).toHaveBeenCalledWith(createPlanDto);
		});

		it('should not touch Stripe for BYN plans', async () => {
			jest.spyOn(repository, 'createPlan').mockResolvedValue(mockPlanOutput as any);

			await service.create(createPlanDto);

			expect(stripeService.createProductWithPrice).not.toHaveBeenCalled();
		});

		it('should not touch Stripe for zero-price trial plans', async () => {
			const trialPlan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 0 };
			jest.spyOn(repository, 'createPlan').mockResolvedValue(trialPlan as any);

			await service.create({ ...createPlanDto, plan_currency: Currency.PLN, plan_price: 0 });

			expect(stripeService.createProductWithPrice).not.toHaveBeenCalled();
		});

		it('should create a Stripe product and price for PLN plans', async () => {
			const plnPlan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 40 };
			const storedPlan = { ...plnPlan, stripe_product_id: 'prod_1', stripe_price_id: 'price_1' };
			jest.spyOn(repository, 'createPlan').mockResolvedValue(plnPlan as any);
			jest.spyOn(stripeService, 'createProductWithPrice').mockResolvedValue({ productId: 'prod_1', priceId: 'price_1' });
			jest.spyOn(repository, 'updateStripeIds').mockResolvedValue(storedPlan as any);

			const result = await service.create({ ...createPlanDto, plan_currency: Currency.PLN, plan_price: 40 });

			expect(stripeService.createProductWithPrice).toHaveBeenCalledWith({
				planId: plnPlan.id,
				name: plnPlan.plan_name,
				priceMajor: 40,
				currency: Currency.PLN,
			});
			expect(repository.updateStripeIds).toHaveBeenCalledWith(plnPlan.id, 'prod_1', 'price_1');
			expect(result).toEqual(storedPlan);
		});

		it('should roll back the plan when Stripe fails', async () => {
			const plnPlan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 40 };
			jest.spyOn(repository, 'createPlan').mockResolvedValue(plnPlan as any);
			jest.spyOn(stripeService, 'createProductWithPrice').mockRejectedValue(new Error('stripe down'));
			jest.spyOn(repository, 'deletePlan').mockResolvedValue(true);

			await expect(service.create({ ...createPlanDto, plan_currency: Currency.PLN, plan_price: 40 })).rejects.toThrow('stripe down');
			// План без цены в Stripe бесполезен — он не должен остаться в базе.
			expect(repository.deletePlan).toHaveBeenCalledWith(plnPlan.id);
		});

		it('should archive an orphaned product when saving ids fails', async () => {
			const plnPlan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 40 };
			jest.spyOn(repository, 'createPlan').mockResolvedValue(plnPlan as any);
			jest.spyOn(stripeService, 'createProductWithPrice').mockResolvedValue({ productId: 'prod_1', priceId: 'price_1' });
			jest.spyOn(repository, 'updateStripeIds').mockRejectedValue(new Error('db down'));
			jest.spyOn(repository, 'deletePlan').mockResolvedValue(true);

			await expect(service.create({ ...createPlanDto, plan_currency: Currency.PLN, plan_price: 40 })).rejects.toThrow('db down');
			expect(stripeService.archiveProduct).toHaveBeenCalledWith('prod_1');
		});
	});

	describe('ensureStripeIds', () => {
		it('should create product and price for a legacy plan without them', async () => {
			const legacyPlan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 40, stripe_price_id: null };
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(legacyPlan as any);
			jest.spyOn(stripeService, 'createProductWithPrice').mockResolvedValue({ productId: 'prod_1', priceId: 'price_1' });
			jest.spyOn(repository, 'updateStripeIds').mockResolvedValue({ ...legacyPlan, stripe_price_id: 'price_1' } as any);

			const result = await service.ensureStripeIds(1);

			expect(stripeService.createProductWithPrice).toHaveBeenCalled();
			expect(result.stripe_price_id).toBe('price_1');
		});

		it('should be a no-op when the plan already has a price', async () => {
			const plan = { ...mockPlanOutput, plan_currency: Currency.PLN, plan_price: 40, stripe_price_id: 'price_1' };
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(plan as any);

			const result = await service.ensureStripeIds(1);

			expect(stripeService.createProductWithPrice).not.toHaveBeenCalled();
			expect(result).toEqual(plan);
		});

		it('should throw when the plan does not exist', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(null);

			await expect(service.ensureStripeIds(1)).rejects.toThrow(NotFoundException);
		});
	});

	describe('ensureStripeProduct', () => {
		// У BYN-плана цены в Stripe нет и быть не может: сумма считается по курсу на момент
		// счёта. Нужен только продукт, к которому привязывается разовая цена.
		const bynPlan = { ...mockPlanOutput, plan_currency: Currency.BYN, plan_price: 20, stripe_product_id: null, stripe_price_id: null };

		it('creates a product without a price for a plan that has none', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(bynPlan as any);
			jest.spyOn(stripeService, 'createProduct').mockResolvedValue({ productId: 'prod_1' });
			jest.spyOn(repository, 'setStripeProductId').mockResolvedValue({ ...bynPlan, stripe_product_id: 'prod_1' } as any);

			const result = await service.ensureStripeProduct(1);

			expect(stripeService.createProduct).toHaveBeenCalledWith({ planId: 1, name: bynPlan.plan_name });
			expect(stripeService.createProductWithPrice).not.toHaveBeenCalled();
			expect(repository.setStripeProductId).toHaveBeenCalledWith(1, 'prod_1');
			expect(result.stripe_product_id).toBe('prod_1');
		});

		it('is a no-op when the plan already has a product', async () => {
			const plan = { ...bynPlan, stripe_product_id: 'prod_1' };
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(plan as any);

			const result = await service.ensureStripeProduct(1);

			expect(stripeService.createProduct).not.toHaveBeenCalled();
			expect(result).toEqual(plan);
		});

		// В отличие от create, сбой Stripe не должен уносить план: по нему ведутся занятия
		// и считается баланс, и без ссылки он вполне работоспособен.
		it('does not delete the plan when Stripe fails', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(bynPlan as any);
			jest.spyOn(stripeService, 'createProduct').mockRejectedValue(new Error('stripe down'));

			await expect(service.ensureStripeProduct(1)).rejects.toThrow('stripe down');
			expect(repository.deletePlan).not.toHaveBeenCalled();
			expect(stripeService.archiveProduct).not.toHaveBeenCalled();
		});

		it('should throw when the plan does not exist', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue(null);

			await expect(service.ensureStripeProduct(1)).rejects.toThrow(NotFoundException);
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

		it('should archive the Stripe product on removal', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue({ ...mockPlanOutput, stripe_product_id: 'prod_1' } as any);
			jest.spyOn(repository, 'deletePlan').mockResolvedValue(true);

			await service.remove(1);

			expect(stripeService.archiveProduct).toHaveBeenCalledWith('prod_1');
		});

		it('should still delete the plan when archiving fails', async () => {
			jest.spyOn(repository, 'getPlanById').mockResolvedValue({ ...mockPlanOutput, stripe_product_id: 'prod_1' } as any);
			jest.spyOn(repository, 'deletePlan').mockResolvedValue(true);
			jest.spyOn(stripeService, 'archiveProduct').mockRejectedValue(new Error('stripe down'));

			// Архивация вспомогательна: недоступность Stripe не должна блокировать удаление плана.
			await expect(service.remove(1)).resolves.toBe(true);
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
