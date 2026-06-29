import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePlanDto } from '@/modules/plan/interface/dto/requests/create-plan.dto';
import { FilterPlanQuery } from '@/modules/plan/interface/dto/requests/filter.query.dto';
import { PlanRepositoryPort } from '@/modules/plan/application/ports/plan.repository.port';
import { PlanEntity } from '@/modules/plan/domain/plan.entity';

@Injectable()
export class PlanService {
	constructor(private readonly planRepository: PlanRepositoryPort) {}
	
 async create(createPlanDto: CreatePlanDto): Promise<PlanEntity> {
    return await this.planRepository.createPlan(createPlanDto);
  }

	async findById(id: number): Promise<PlanEntity | null> {
		return await this.planRepository.getPlanById(id);
	}

  async remove(id: number): Promise<boolean> {
		const plan = await this.planRepository.getPlanById(id);
		if (!plan) {
			throw new NotFoundException("План не найден");
		}
		if (plan.deleted_at) {
			throw new BadRequestException("План уже удален");
		}
    return await this.planRepository.deletePlan(id);
  }
}
