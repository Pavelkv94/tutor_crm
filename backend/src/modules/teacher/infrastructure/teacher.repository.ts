import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Teacher, TeacherRole, Telegram } from '@/infrastructure/prisma/generated/client';
import { Injectable, NotFoundException } from "@nestjs/common";
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { CreateTeacherDto } from "@/modules/teacher/interface/dto/requests/create-teacher.input.dto";
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { UpdateTeacherDto } from "@/modules/teacher/interface/dto/requests/update-teacher.input.dto";
import { FilterTeacherQuery } from "@/modules/teacher/interface/dto/requests/filter.query.dto";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { TelegramUserEnum } from "@/modules/telegram/interface/dto/telegram-user.enum";

@Injectable()
export class TeacherRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getTeacherById(id: number): Promise<TeacherDto | null> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id },
			include: {
				telegrams: true,
			}
		});
		if (!teacher) {
			return null;
		}
		return this.mapTeacherToView(teacher);
	}

	async getTeachers(filter: FilterTeacherQuery): Promise<TeacherDto[]> {
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
				role: true,
				timezone: true,
				deleted_at: true,
				created_at: true,
				telegrams: true,
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

	async createTeacher(createTeacherDto: CreateTeacherDto): Promise<TeacherDto> {
		const teacher = await this.prisma.teacher.create({
			data: {
				...createTeacherDto,
				role: TeacherRole.TEACHER,
			},
			include: {
				telegrams: true,
			},
		});
		return this.mapTeacherToView(teacher);
	}

	async createAdmin(createAdminDto: any): Promise<TeacherDto> {
		const admin = await this.prisma.teacher.create({
			data: {
				...createAdminDto,
				role: TeacherRole.ADMIN,
				timezone: Timezone.BY,
			},
			include: {
				telegrams: true,
			},
		});
		return this.mapTeacherToView(admin);
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

	private mapTeacherToView(teacher: Teacher & { telegrams: Telegram[] }): TeacherDto {
		return {
			id: teacher.id,
			name: teacher.name,
			login: teacher.login,
			role: teacher.role,
			timezone: teacher.timezone as Timezone,
			deleted_at: teacher.deleted_at ?? null,
			created_at: teacher.created_at,
			telegrams: teacher.telegrams.map((telegram) => ({
				id: telegram.id,
				telegram_id: telegram.telegram_id,
				username: telegram.username ?? "",
				first_name: telegram.first_name ?? "",
				type: telegram.type as TelegramUserEnum,
			})),
		};
	}
}