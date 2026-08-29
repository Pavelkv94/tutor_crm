import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Teacher, TeacherBillingDetails, TeacherRole, Telegram } from '@/infrastructure/prisma/generated/client';
import { Injectable, NotFoundException } from "@nestjs/common";
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { CreateTeacherDto } from "@/modules/teacher/interface/dto/requests/create-teacher.input.dto";
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { UpdateTeacherDto } from "@/modules/teacher/interface/dto/requests/update-teacher.input.dto";
import { FilterTeacherQuery } from "@/modules/teacher/interface/dto/requests/filter.query.dto";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { TelegramUserEnum } from "@/modules/telegram/interface/dto/telegram-user.enum";
import { TeacherBillingDetailsDto } from "@/modules/teacher/interface/dto/responses/teacher-billing-details.dto";

@Injectable()
export class TeacherRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getTeacherById(id: number): Promise<TeacherDto | null> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id },
			include: {
				telegrams: true,
				billing_details: true,
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
				birth_date: true,
				deleted_at: true,
				created_at: true,
				telegrams: true,
				billing_details: true,
			},
			orderBy: [{ deleted_at: 'desc' }, { role: 'desc' }, { name: 'asc' }],
		});
		return teachers.map(this.mapTeacherToView);
	}

	/**
	 * Преподаватели, о днях рождения которых напоминаем администратору. Роль ADMIN отсеяна:
	 * получатель напоминаний сам администратор, напоминать ему о собственном дне рождения незачем.
	 */
	async getActiveTeachersWithBirthdays(): Promise<Teacher[]> {
		return await this.prisma.teacher.findMany({
			where: {
				deleted_at: null,
				birth_date: { not: null },
				role: TeacherRole.TEACHER,
			},
		});
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
		const { billing_details, ...teacherData } = createTeacherDto;
		const teacher = await this.prisma.teacher.create({
			data: {
				...teacherData,
				// ValidationPipe работает без transform, поэтому дата приходит строкой
				birth_date: teacherData.birth_date ? new Date(teacherData.birth_date) : null,
				role: TeacherRole.TEACHER,
				billing_details: billing_details ? { create: billing_details } : undefined,
			},
			include: {
				telegrams: true,
				billing_details: true,
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
				billing_details: true,
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
		const { billing_details, ...teacherData } = updateTeacherDto;
		const teacherPatch: Prisma.TeacherUpdateInput = { ...teacherData };
		if (teacherData.birth_date) {
			teacherPatch.birth_date = new Date(teacherData.birth_date);
		}
		await this.prisma.teacher.update({
			where: { id },
			data: {
				...teacherPatch,
				// upsert: карточка реквизитов создаётся при первом сохранении и обновляется дальше
				billing_details: billing_details
					? { upsert: { create: billing_details, update: billing_details } }
					: undefined,
			},
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

	private mapTeacherToView(teacher: Omit<Teacher, 'password'> & { telegrams: Telegram[]; billing_details?: TeacherBillingDetails | null }): TeacherDto {
		return {
			id: teacher.id,
			name: teacher.name,
			login: teacher.login,
			role: teacher.role,
			timezone: teacher.timezone as Timezone,
			birth_date: teacher.birth_date ?? null,
			deleted_at: teacher.deleted_at ?? null,
			created_at: teacher.created_at,
			telegrams: teacher.telegrams.map((telegram) => ({
				id: telegram.id,
				telegram_id: telegram.telegram_id,
				username: telegram.username ?? "",
				first_name: telegram.first_name ?? "",
				type: telegram.type as TelegramUserEnum,
			})),
			billing_details: mapBillingDetailsToView(teacher.billing_details ?? null),
		};
	}
}

const mapBillingDetailsToView = (details: TeacherBillingDetails | null): TeacherBillingDetailsDto | null => {
	if (!details) {
		return null;
	}
	return {
		full_name_latin: details.full_name_latin,
		address: details.address,
		passport: details.passport,
		email: details.email,
		bank_name: details.bank_name,
		bank_account: details.bank_account,
	};
};
