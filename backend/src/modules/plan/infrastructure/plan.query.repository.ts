import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Injectable } from "@nestjs/common";
import { Plan } from '@/infrastructure/prisma/generated/client';
import { FilterPlanQuery } from "@/modules/plan/interface/dto/requests/filter.query.dto";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PlanQueryRepositoryPort } from '../application/ports/plan.query.repository.port';
import { PlanDto } from '../interface/dto/responses/plan.dto';

@Injectable()
export class PlanQueryRepository implements PlanQueryRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async getPlans(filter: FilterPlanQuery): Promise<PlanDto[]> {
		const where: Prisma.PlanWhereInput = {};
		if (filter === FilterPlanQuery.ACTIVE) {
			where.deleted_at = null;
		} else if (filter === FilterPlanQuery.DELETED) {
			where.deleted_at = { not: null };
		}
		const plans = await this.prisma.plan.findMany({
			where,
			orderBy: [{ deleted_at: 'desc' }, { plan_name: 'asc' }],
		});
		return plans.map(this.mapPlanToView);
	}


	async getPlanById(id: number): Promise<PlanDto | null> {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
		});
		if (!plan) {
			return null;
		}
		return this.mapPlanToView(plan);
	}

	private mapPlanToView(plan: Plan): PlanDto {
		return {
			id: plan.id,
			plan_name: plan.plan_name,
			plan_price: plan.plan_price,
			plan_currency: plan.plan_currency,
			duration: plan.duration,
			plan_type: plan.plan_type,
			deleted_at: plan.deleted_at || null,
			created_at: plan.created_at,
		};
	}
}