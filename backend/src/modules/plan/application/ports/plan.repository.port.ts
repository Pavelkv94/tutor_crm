import { PlanEntity } from "../../domain/plan.entity";
import { CreatePlanDto } from "../../interface/dto/requests/create-plan.dto";
import { FilterPlanQuery } from "../../interface/dto/requests/filter.query.dto";

export abstract class PlanRepositoryPort {
	abstract createPlan(createPlanDto: CreatePlanDto): Promise<PlanEntity>;
	abstract getPlanById(id: number): Promise<PlanEntity | null>;
	abstract deletePlan(id: number): Promise<boolean>;
}