import { Module } from '@nestjs/common';
import { PlanService } from './application/plan.service';
import { PlanController } from './interface/plan.controller';
import { PlanRepository } from './infrastructure/plan.repository';
import { PlanRepositoryPort } from './application/ports/plan.repository.port';
import { PlanQueryRepository } from './infrastructure/plan.query.repository';
import { PlanQueryRepositoryPort } from './application/ports/plan.query.repository.port';

@Module({
	controllers: [PlanController],
	providers: [
		PlanService,
		{ provide: PlanQueryRepositoryPort, useClass: PlanQueryRepository },
		{ provide: PlanRepositoryPort, useClass: PlanRepository }
	],
	exports: [PlanService],
})
export class PlanModule { }
