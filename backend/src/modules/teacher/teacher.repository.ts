import { PrismaService } from "src/core/prisma/prisma.service";
import { Teacher, TeacherRole } from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { Timezone } from "./dto/teacher.output.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.input.dto";

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
				timezone: true,
				telegram_link: true,
				deleted_at: true,
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

	async updateTeacher(id: number, updateTeacherDto: UpdateTeacherDto): Promise<void> {
		await this.prisma.teacher.update({
			where: { id },
			data: updateTeacherDto,
		});
	}

	async deleteTeacher(id: number): Promise<void> {
		await this.prisma.teacher.update({
			where: { id },
			data: {
				deleted_at: new Date(),
			},
		});
	}

	private mapTeacherToView(teacher: Teacher): TeacherOutputDto {
		return {
			id: teacher.id,
			name: teacher.name,
			login: teacher.login,
			telegram_id: teacher.telegram_id || null,
			role: teacher.role,
			timezone: teacher.timezone as Timezone,
			telegram_link: teacher.telegram_link || null,
			deleted_at: teacher.deleted_at || null,
		};
	}
}