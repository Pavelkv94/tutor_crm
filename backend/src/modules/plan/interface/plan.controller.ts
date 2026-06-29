import { Controller, Get, Post, Body, Param, Delete, UseGuards, HttpStatus, HttpCode, Query } from '@nestjs/common';
import { PlanService } from '../application/plan.service';
import { CreatePlanDto } from './dto/requests/create-plan.dto';
import { JwtAccessGuard } from '@/shared/guards/jwt-access.guard';
import { AdminAccessGuard } from '@/shared/guards/admin-access.guard';
import { PlanDto } from './dto/responses/plan.dto';
import { CreatePlanSwagger } from '@/shared/decorators/swagger/plan/create-plan-swagger.decorator';
import { GetPlansSwagger } from '@/shared/decorators/swagger/plan/get-plans-swagger.decorator';
import { DeletePlanSwagger } from '@/shared/decorators/swagger/plan/delete-plan-swagger.decorator';
import { ApiTags } from '@nestjs/swagger';
import { FilterPlanQuery } from './dto/requests/filter.query.dto';
import { mapPlanToResponse } from './mappers/plan-response.mapper';
import { PlanQueryRepositoryPort } from '../application/ports/plan.query.repository.port';

@ApiTags('Plans')
@Controller('plans')
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class PlanController {
  constructor(
		private readonly planService: PlanService,
		private readonly planQueryRepository: PlanQueryRepositoryPort
	) {}

	@CreatePlanSwagger()
  @Post()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async create(@Body() createPlanDto: CreatePlanDto): Promise<PlanDto> {
		const plan = await this.planService.create(createPlanDto);
		return mapPlanToResponse(plan);
  }

	@GetPlansSwagger()
  @Get()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findAll(@Query('filter') filter: FilterPlanQuery = FilterPlanQuery.ALL): Promise<PlanDto[]> {
		return await this.planQueryRepository.getPlans(filter);
	}

	@DeletePlanSwagger()
  @Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async remove(@Param('id') id: string): Promise<boolean> {
		return await this.planService.remove(+id);
  }
}
