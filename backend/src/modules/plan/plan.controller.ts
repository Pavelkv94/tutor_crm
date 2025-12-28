import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanInputDto } from './dto/create-plan.input.dto';
import { JwtAccessGuard } from 'src/core/guards/jwt-access.guard';
import { AdminAccessGuard } from 'src/core/guards/admin-access.guard';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
  create(@Body() createPlanDto: CreatePlanInputDto) {
    return this.planService.create(createPlanDto);
  }

  @Get()
	@UseGuards(JwtAccessGuard)
  findAll() {
    return this.planService.findAll();
  }

  @Delete(':id')
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
  remove(@Param('id') id: string) {
    return this.planService.remove(+id);
  }
}
