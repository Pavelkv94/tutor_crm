import { PrismaService } from "src/core/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Plan } from "@prisma/client";
import { CreatePlanInputDto } from "./dto/create-plan.input.dto";
import { PlanOutputDto } from "./dto/plan.output.dto";

@Injectable()
export class PlanRepository {
	constructor(private readonly prisma: PrismaService) {}

	async createPlan(createPlanDto: CreatePlanInputDto): Promise<PlanOutputDto> {
		const plan = await this.prisma.plan.create({
			data: { ...createPlanDto, plan_name: `${createPlanDto.plan_type} ${createPlanDto.duration} min` },
		});
		return this.mapPlanToView(plan);
	}
	
	async getPlans(): Promise<PlanOutputDto[]> {
		const plans = await this.prisma.plan.findMany({
			orderBy: {
				deleted_at: 'desc',
			},
		});
		return plans.map(this.mapPlanToView);
	}

	async getPlanById(id: number): Promise<PlanOutputDto | null> {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
		});
		if (!plan) {
			return null;
		}
		return this.mapPlanToView(plan);
	}

	async deletePlan(id: number): Promise<boolean> {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
		});
		if (!plan) {
			throw new NotFoundException('Plan not found');
		}
		const result = await this.prisma.plan.update({
			where: { id },
			data: {
				deleted_at: new Date(),
			},
		});
		return result !== null;
	}

	private mapPlanToView(plan: Plan): PlanOutputDto {
		return {
			id: plan.id,
			plan_name: plan.plan_name,
			plan_price: plan.plan_price,
			plan_currency: plan.plan_currency,
			duration: plan.duration,
			plan_type: plan.plan_type,
			deleted_at: plan.deleted_at || null,
		};
	}
}