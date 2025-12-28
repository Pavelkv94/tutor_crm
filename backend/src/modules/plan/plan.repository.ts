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
			data: createPlanDto,
		});
		return this.mapPlanToView(plan);
	}
	
	async getPlans(): Promise<PlanOutputDto[]> {
		const plans = await this.prisma.plan.findMany();
		return plans.map(this.mapPlanToView);
	}

	async deletePlan(id: number): Promise<boolean> {
		const plan = await this.prisma.plan.findUnique({
			where: { id },
		});
		if (!plan) {
			throw new NotFoundException('Plan not found');
		}
		const result = await this.prisma.plan.delete({
			where: { id },
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
		};
	}
}