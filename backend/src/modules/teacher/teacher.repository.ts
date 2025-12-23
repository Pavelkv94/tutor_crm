import { PrismaService } from "src/core/prisma/prisma.service";
import { Teacher, TeacherRole } from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";

@Injectable()
export class TeacherRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getTeacherById(id: number): Promise<TeacherOutputDto> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id }
		});
		if (!teacher) {
			throw new NotFoundException("Teacher not found");
		}
		return this.mapTeacherToView(teacher);
	}

	async getTeachers(): Promise<TeacherOutputDto[]> {
		const teachers = await this.prisma.teacher.findMany({
			select: {
				id: true,
				name: true,
				login: true,
				telegram_id: true,
				role: true,
			},
		});
		return teachers.map(this.mapTeacherToView);
	}

	async getTeacherByLogin(login: string): Promise<Teacher | null> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { login }
		});
		if (!teacher) {
			return null;
		}
		return teacher;
	}

	async createTeacher(createTeacherDto: CreateTeacherDto): Promise<TeacherOutputDto> {
		const teacher = await this.prisma.teacher.create({
			data: {
				...createTeacherDto,
				role: TeacherRole.TEACHER,
			},
		});
		return this.mapTeacherToView(teacher);
	}

	private mapTeacherToView(teacher: Teacher): TeacherOutputDto {
		return {
			id: teacher.id,
			name: teacher.name,
			login: teacher.login,
			telegram_id: teacher.telegram_id || null,
			role: teacher.role,
		};
	}
}