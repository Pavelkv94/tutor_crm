import { mapPlanToResponse } from '../../../src/modules/plan/interface/mappers/plan-response.mapper';
import { PlanTypeEnum } from '../../../src/modules/plan/interface/dto/requests/create-plan.dto';

describe('mapPlanToResponse', () => {
	it('should map plan entity to dto', () => {
		const planEntity = {
			id: 1,
			plan_name: 'Test Plan',
			plan_price: 100000,
			plan_currency: 'USD',
			duration: 10,
			plan_type: PlanTypeEnum.INDIVIDUAL,
			deleted_at: null,
			created_at: new Date('2024-01-01'),
		};

		const result = mapPlanToResponse(planEntity);

		expect(result).toEqual({
			id: 1,
			plan_name: 'Test Plan',
			plan_price: 100000,
			plan_currency: 'USD',
			duration: 10,
			plan_type: PlanTypeEnum.INDIVIDUAL,
			deleted_at: null,
			created_at: planEntity.created_at,
		});
	});

	it('should preserve deleted_at when plan is deleted', () => {
		const deletedAt = new Date('2024-06-01');
		const planEntity = {
			id: 2,
			plan_name: 'Deleted Plan',
			plan_price: 50000,
			plan_currency: 'RUB',
			duration: 5,
			plan_type: PlanTypeEnum.PAIR,
			deleted_at: deletedAt,
			created_at: new Date('2024-01-01'),
		};

		const result = mapPlanToResponse(planEntity);

		expect(result.deleted_at).toEqual(deletedAt);
		expect(result.plan_type).toBe(PlanTypeEnum.PAIR);
	});
});
