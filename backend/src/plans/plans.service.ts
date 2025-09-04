import { Injectable } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PlansService {
	constructor(private readonly prisma: PrismaService) {}
	
  create(createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: createPlanDto,
    });
  }

  findAll() {
    return this.prisma.plan.findMany();
  }

  remove(id: number) {
    return this.prisma.plan.delete({
      where: { id },
    });
  }
}
