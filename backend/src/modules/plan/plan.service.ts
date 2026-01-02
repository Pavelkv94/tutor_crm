import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanInputDto } from './dto/create-plan.input.dto';
import { PlanRepository } from './plan.repository';
import { PlanOutputDto } from './dto/plan.output.dto';
import { FilterPlanQuery } from './dto/filter.query.dto';

@Injectable()
export class PlanService {
	constructor(private readonly planRepository: PlanRepository) {}
	
 async create(createPlanDto: CreatePlanInputDto): Promise<PlanOutputDto> {
    return await this.planRepository.createPlan(createPlanDto);
  }

	async findAll(filter: FilterPlanQuery): Promise<PlanOutputDto[]> {
		return await this.planRepository.getPlans(filter);
  }

	async findById(id: number): Promise<PlanOutputDto | null> {
		return await this.planRepository.getPlanById(id);
	}

  async remove(id: number): Promise<boolean> {
		const plan = await this.planRepository.getPlanById(id);
		if (!plan) {
			throw new NotFoundException("Plan not found");
		}
		if (plan.deleted_at) {
			throw new BadRequestException("Plan already deleted");
		}
    return await this.planRepository.deletePlan(id);
  }
}
