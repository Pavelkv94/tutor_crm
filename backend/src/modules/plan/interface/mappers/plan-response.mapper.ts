import { PlanEntity } from "../../domain/plan.entity";
import { PlanDto } from "../dto/responses/plan.dto";

export function mapPlanToResponse(plan: PlanEntity): PlanDto {
	return {
		id: plan.id,
		plan_name: plan.plan_name,
		plan_price: plan.plan_price,
		plan_currency: plan.plan_currency,
		duration: plan.duration,
		plan_type: plan.plan_type,
		deleted_at: plan.deleted_at,
		created_at: plan.created_at,
	};
}