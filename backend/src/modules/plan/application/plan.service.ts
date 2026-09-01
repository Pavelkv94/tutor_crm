import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatePlanDto } from '@/modules/plan/interface/dto/requests/create-plan.dto';
import { PlanRepositoryPort } from '@/modules/plan/application/ports/plan.repository.port';
import { PlanEntity } from '@/modules/plan/domain/plan.entity';
import { StripeService } from '@/infrastructure/stripe/stripe.service';
import { Currency } from '@/shared/enums/currency.enum';

/** Валюты, которые обслуживаются Stripe. Для BYN оплата принимается вне системы. */
const STRIPE_CURRENCIES: Currency[] = [Currency.PLN, Currency.EUR];

@Injectable()
export class PlanService {
	private readonly logger = new Logger(PlanService.name);

	constructor(
		private readonly planRepository: PlanRepositoryPort,
		private readonly stripeService: StripeService,
	) {}

	async create(createPlanDto: CreatePlanDto): Promise<PlanEntity> {
		const plan = await this.planRepository.createPlan(createPlanDto);
		if (!this.needsStripeProduct(plan)) {
			return plan;
		}
		return this.createStripeProduct(plan);
	}

	async findById(id: number): Promise<PlanEntity | null> {
		return await this.planRepository.getPlanById(id);
	}

	/**
	 * Дозаводит продукт и цену в Stripe для планов, созданных до появления оплат.
	 * Идемпотентно: повторный вызов для плана с готовыми id-шниками ничего не делает,
	 * а idempotencyKey защищает от дублей на стороне Stripe.
	 */
	async ensureStripeIds(id: number): Promise<PlanEntity> {
		const plan = await this.planRepository.getPlanById(id);
		if (!plan) {
			throw new NotFoundException('План не найден');
		}
		if (plan.stripe_price_id || !this.needsStripeProduct(plan)) {
			return plan;
		}
		return this.createStripeProduct(plan);
	}

	/**
	 * Дозаводит плану только продукт в Stripe, без цены. Нужен планам в валюте, которую
	 * Stripe у нас напрямую не обслуживает (BYN): счёт таким ученикам предъявляется в евро
	 * по курсу школы, цена позиции считается на момент выставления и передаётся разовой
	 * `price_data`, привязанной к этому продукту. Готового Price у плана нет и быть не может.
	 *
	 * В отличие от createStripeProduct, ошибка Stripe здесь НЕ удаляет план: план в BYN
	 * полезен сам по себе — по нему ведутся занятия и считается баланс, — и терять его
	 * из-за недоступности платёжки нельзя. Ошибка уходит наверх, вызывающий выставляет
	 * счёт без ссылки.
	 *
	 * Идемпотентно: у плана с готовым продуктом ничего не делает.
	 */
	async ensureStripeProduct(id: number): Promise<PlanEntity> {
		const plan = await this.planRepository.getPlanById(id);
		if (!plan) {
			throw new NotFoundException('План не найден');
		}
		if (plan.stripe_product_id) {
			return plan;
		}

		const created = await this.stripeService.createProduct({ planId: plan.id, name: plan.plan_name });
		return this.planRepository.setStripeProductId(plan.id, created.productId);
	}

	async remove(id: number): Promise<boolean> {
		const plan = await this.planRepository.getPlanById(id);
		if (!plan) {
			throw new NotFoundException("План не найден");
		}
		if (plan.deleted_at) {
			throw new BadRequestException("План уже удален");
		}

		const result = await this.planRepository.deletePlan(id);

		if (plan.stripe_product_id) {
			// Архивация — вспомогательное действие: если Stripe недоступен, план всё равно удалён.
			// Откатывать soft-delete из-за этого нельзя, иначе удаление станет неотказоустойчивым.
			try {
				await this.stripeService.archiveProduct(plan.stripe_product_id);
			} catch (error) {
				this.logger.error(`Не удалось архивировать продукт Stripe ${plan.stripe_product_id} плана ${id}: ${(error as Error).message}`);
			}
		}

		return result;
	}

	private needsStripeProduct(plan: PlanEntity): boolean {
		return STRIPE_CURRENCIES.includes(plan.plan_currency) && plan.plan_price > 0;
	}

	private async createStripeProduct(plan: PlanEntity): Promise<PlanEntity> {
		let productId: string | null = null;
		try {
			const created = await this.stripeService.createProductWithPrice({
				planId: plan.id,
				name: plan.plan_name,
				priceMinor: plan.plan_price,
				currency: plan.plan_currency,
			});
			productId = created.productId;
			return await this.planRepository.updateStripeIds(plan.id, created.productId, created.priceId);
		} catch (error) {
			// План без цены в Stripe бесполезен: по нему нельзя выставить ссылку на оплату.
			// Убираем его, чтобы админ не работал с планом-полуфабрикатом.
			this.logger.error(`Не удалось завести план ${plan.id} в Stripe: ${(error as Error).message}`);
			if (productId) {
				try {
					await this.stripeService.archiveProduct(productId);
				} catch (archiveError) {
					this.logger.error(`Не удалось архивировать осиротевший продукт ${productId}: ${(archiveError as Error).message}`);
				}
			}
			try {
				await this.planRepository.deletePlan(plan.id);
			} catch (deleteError) {
				this.logger.error(`Не удалось откатить план ${plan.id}: ${(deleteError as Error).message}`);
			}
			throw error;
		}
	}
}
