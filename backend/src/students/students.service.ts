import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
	constructor(private readonly prisma: PrismaService) {}

  create(createStudentDto: CreateStudentDto) {
		return this.prisma.student.create({
			data: createStudentDto,
		});
  }

  findAll() {
		return this.prisma.student.findMany({
			include: {
				telegrams: true,
				lessons: true,
			},
		});
  }

  update(id: number, updateStudentDto: UpdateStudentDto) {
		return this.prisma.student.update({
			where: { id },
			data: updateStudentDto,
		});
  }

  remove(id: number) {
		return this.prisma.student.delete({
			where: { id },
		});
  }
}
