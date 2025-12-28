import { Controller, Get, Post, Body, Param, Delete, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanInputDto } from './dto/create-plan.input.dto';
import { JwtAccessGuard } from 'src/core/guards/jwt-access.guard';
import { AdminAccessGuard } from 'src/core/guards/admin-access.guard';
import { PlanOutputDto } from './dto/plan.output.dto';
import { CreatePlanSwagger } from 'src/core/decorators/swagger/plan/create-plan-swagger.decorator';
import { GetPlansSwagger } from 'src/core/decorators/swagger/plan/get-plans-swagger.decorator';
import { DeletePlanSwagger } from 'src/core/decorators/swagger/plan/delete-plan-swagger.decorator';
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

	@CreatePlanSwagger()
  @Post()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async create(@Body() createPlanDto: CreatePlanInputDto): Promise<PlanOutputDto> {
		return await this.planService.create(createPlanDto);
  }

	@GetPlansSwagger()
  @Get()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findAll(): Promise<PlanOutputDto[]> {
		return await this.planService.findAll();
  }

	@DeletePlanSwagger()
  @Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async remove(@Param('id') id: string): Promise<boolean> {
		return await this.planService.remove(+id);
  }
}
