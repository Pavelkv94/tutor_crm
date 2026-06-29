import { FilterPlanQuery } from "../../interface/dto/requests/filter.query.dto";
import { PlanDto } from "../../interface/dto/responses/plan.dto";

export abstract class PlanQueryRepositoryPort {
	abstract getPlans(filter: FilterPlanQuery): Promise<PlanDto[]>;
	abstract getPlanById(id: number): Promise<PlanDto | null>;
}