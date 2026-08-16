import { mapPlanToResponse } from '../../../src/modules/plan/interface/mappers/plan-response.mapper';
import { PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';
import { PlanEntity } from '../../../src/modules/plan/domain/plan.entity';
import { Currency } from '../../../src/shared/enums/currency.enum';

describe('mapPlanToResponse', () => {
	it('should map plan entity to dto', () => {
		const planEntity: PlanEntity = {
			id: 1,
			plan_name: 'Test Plan',
			plan_price: 100000,
			plan_currency: Currency.EUR,
			duration: 10,
			plan_type: PlanTypeEnum.INDIVIDUAL,
			deleted_at: null,
			created_at: new Date('2024-01-01'),
			stripe_product_id: null,
			stripe_price_id: null,
		};

		const result = mapPlanToResponse(planEntity);

		expect(result).toEqual({
			id: 1,
			plan_name: 'Test Plan',
			plan_price: 100000,
			plan_currency: Currency.EUR,
			duration: 10,
			plan_type: PlanTypeEnum.INDIVIDUAL,
			deleted_at: null,
			created_at: planEntity.created_at,
		});
	});

	it('should preserve deleted_at when plan is deleted', () => {
		const deletedAt = new Date('2024-06-01');
		const planEntity: PlanEntity = {
			id: 2,
			plan_name: 'Deleted Plan',
			plan_price: 50000,
			plan_currency: Currency.PLN,
			duration: 5,
			plan_type: PlanTypeEnum.PAIR,
			deleted_at: deletedAt,
			created_at: new Date('2024-01-01'),
			stripe_product_id: null,
			stripe_price_id: null,
		};

		const result = mapPlanToResponse(planEntity);

		expect(result.deleted_at).toEqual(deletedAt);
		expect(result.plan_type).toBe(PlanTypeEnum.PAIR);
	});
});
