import { Injectable } from '@nestjs/common';
import { CreatePlanInputDto } from './dto/create-plan.input.dto';
import { PlanRepository } from './plan.repository';
import { PlanOutputDto } from './dto/plan.output.dto';

@Injectable()
export class PlanService {
	constructor(private readonly planRepository: PlanRepository) {}
	
 async create(createPlanDto: CreatePlanInputDto): Promise<PlanOutputDto> {
    return await this.planRepository.createPlan(createPlanDto);
  }

  async findAll(): Promise<PlanOutputDto[]> {
    return await this.planRepository.getPlans();
  }

  async remove(id: number): Promise<boolean> {
    return await this.planRepository.deletePlan(id);
  }
}
