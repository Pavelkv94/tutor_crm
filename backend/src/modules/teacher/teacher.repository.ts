import { PrismaService } from "src/core/prisma/prisma.service";
import { Teacher, TeacherRole } from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { Timezone } from "./dto/teacher.output.dto";
import { UpdateTeacherDto } from "./dto/update-teacher.input.dto";
import { FilterTeacherQuery } from "./dto/filter.query.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class TeacherRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getTeacherById(id: number): Promise<TeacherOutputDto | null> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id }
		});
		if (!teacher) {
			return null;
		}
		return this.mapTeacherToView(teacher);
	}

	async getTeachers(filter: FilterTeacherQuery): Promise<TeacherOutputDto[]> {
		const where: Prisma.TeacherWhereInput = {};
		if (filter === FilterTeacherQuery.ACTIVE) {
			where.deleted_at = null;
		} else if (filter === FilterTeacherQuery.DELETED) {
			where.deleted_at = { not: null };
		}
		const teachers = await this.prisma.teacher.findMany({
			where,
			select: {
				id: true,
				name: true,
				login: true,
				telegram_id: true,
				role: true,
				timezone: true,
				telegram_link: true,
				deleted_at: true,
				created_at: true,
			},
			orderBy: [{ deleted_at: 'desc' }, { name: 'asc' }],
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
		const teacher = await this.prisma.teacher.findUnique({
			where: { id }
		});
		if (!teacher) {
			throw new NotFoundException("Преподаватель не найден");
		}
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
			created_at: teacher.created_at,
		};
	}
}