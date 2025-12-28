import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanRepository } from './plan.repository';

@Module({
  controllers: [PlanController],
  providers: [PlanService, PlanRepository],
	exports: [PlanService],
})
export class PlanModule {}
