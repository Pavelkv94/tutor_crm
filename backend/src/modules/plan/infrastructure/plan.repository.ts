import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Injectable } from "@nestjs/common";
import { Plan } from '@/infrastructure/prisma/generated/client';
import { CreatePlanDto } from "@/modules/plan/interface/dto/requests/create-plan.dto";
import { FilterPlanQuery } from "@/modules/plan/interface/dto/requests/filter.query.dto";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { PlanEntity } from '../domain/plan.entity';
import { PlanRepositoryPort } from '../application/ports/plan.repository.port';

@Injectable()
export class PlanRepository implements PlanRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async createPlan(createPlanDto: CreatePlanDto): Promise<PlanEntity> {
		const plan = await this.prisma.plan.create({
			data: { ...createPlanDto, plan_name: `${createPlanDto.plan_type} ${createPlanDto.duration} мин ${createPlanDto.plan_price === 0 ? ' (пробное)' : ''}` },
		});
		return this.mapPlanToEntity(plan);
	}

	async getPlanById(id: number): Promise<PlanEntity | null> {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
		});
		if (!plan) {
			return null;
		}
		return this.mapPlanToEntity(plan);
	}

	async deletePlan(id: number): Promise<boolean> {
		const result = await this.prisma.plan.update({
			where: { id },
			data: {
				deleted_at: new Date(),
			},
		});
		return result !== null;
	}

	private mapPlanToEntity(plan: Plan): PlanEntity {
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