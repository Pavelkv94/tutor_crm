import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CreateStudentDto } from "@/modules/student/interface/dto/requests/create-student.dto";
import { Injectable } from "@nestjs/common";
import { StudentDto, StudentExtendedDto } from "@/modules/student/interface/dto/responses/student.dto";
import { UpdateStudentDto } from "@/modules/student/interface/dto/requests/update-student.dto";
import { FilterStudentQuery } from "@/modules/student/interface/dto/requests/filter.query.dto";
import { Prisma } from "@/infrastructure/prisma/generated/client";
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { PlanDto } from "@/modules/plan/interface/dto/responses/plan.dto";
import { calculateAgeFromBirthDate } from '@/shared/utils/calculate-age.util';
import { Student, Plan } from '@/infrastructure/prisma/generated/client';
import { Currency } from '@/shared/enums/currency.enum';

/**
 * Поля ученика в том виде, в каком они лежат в БД: `terms_accepted` наружу отдаётся булевым,
 * но хранится датой, поэтому DTO нельзя спредить в Prisma как есть.
 */
export type StudentUpdateData = Omit<UpdateStudentDto, 'terms_accepted'> & {
	marketing_consent_at?: Date | null;
	terms_accepted_at?: Date | null;
};

@Injectable()
export class StudentRepository {
	constructor(private readonly prisma: PrismaService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentDto> {
		const student = await this.prisma.student.create({
			data: {
				...createStudentDto,
				birth_date: createStudentDto.birth_date ? new Date(createStudentDto.birth_date) : null,
				// Проставленная при заведении галочка — это уже полученный ответ; без даты
				// ученик всё равно увидел бы вопрос на первой оплате.
				marketing_consent_at: createStudentDto.marketing_consent ? new Date() : null,
			},
		});
		return this.mapStudentToView(student);
	}

	async getStudentsByTeacherId(teacher_id: number, filter: FilterStudentQuery): Promise<StudentDto[]> {
		const where: Prisma.StudentWhereInput = {};
		if (filter === FilterStudentQuery.ACTIVE) {
			where.deleted_at = null;
		} else if (filter === FilterStudentQuery.DELETED) {
			where.deleted_at = { not: null };
		}
		const students = await this.prisma.student.findMany({
			where: { ...where, teacher_id: teacher_id },
			orderBy: [{ deleted_at: 'desc' }, { class: 'asc' }, { name: 'asc' }],
		});
		return students.map(this.mapStudentToView);
	}

	async getStudent(id: number): Promise<StudentExtendedDto | null> {
		const student = await this.prisma.student.findUnique({
			where: { id },
			include: {
				telegrams: true,
			},
		});

		const plans = await this.prisma.plan.findMany({ where: { lessons: { some: { student_id: id, date: { gte: new Date() }, }, }, deleted_at: null }, distinct: ['id'], });
		const uniquePlansIds = [...new Set(plans.map(p => p.id))];
		const uniquePlans = plans.filter(p => uniquePlansIds.includes(p.id));
		if (!student) {
			return null;
		}

		return this.mapStudentToExtendedView(student, uniquePlans);
	}

	async getActiveStudentsWithBirthdays(): Promise<any> {
		const students = await this.prisma.student.findMany({
			where: {
				deleted_at: null, birth_date: { not: null }, teacher: {
					telegrams: {
						some: {}
					}
				}
			},
			include: {
				teacher: {
					include: {
						telegrams: true,
					},
				},
			},
		});
		return students;
	}

	async updateStudent(id: number, updateStudentData: StudentUpdateData): Promise<boolean> {
		const updateData: any = { ...updateStudentData };
		if (updateStudentData.birth_date) {
			updateData.birth_date = new Date(updateStudentData.birth_date);
		}
		const result = await this.prisma.student.update({ where: { id }, data: updateData });
		return result !== null;
	}

	/**
	 * Записывает согласия, полученные на странице оплаты. Условие `*_at: null` в `where`
	 * делает операцию идемпотентной без чтения состояния: Stripe ретраит упавшие события,
	 * и read-modify-write здесь ловил бы гонку. «Ноль обновлённых строк» — нормальный исход,
	 * поэтому updateMany, а не update.
	 */
	async applyCheckoutConsents(id: number, consents: { termsAccepted?: boolean; marketingConsent?: boolean }, at: Date): Promise<void> {
		if (consents.termsAccepted) {
			await this.prisma.student.updateMany({
				where: { id, terms_accepted_at: null },
				data: { terms_accepted_at: at },
			});
		}
		if (consents.marketingConsent !== undefined) {
			await this.prisma.student.updateMany({
				where: { id, marketing_consent_at: null },
				data: { marketing_consent: consents.marketingConsent, marketing_consent_at: at },
			});
		}
	}

	async deleteStudent(id: number): Promise<boolean> {
		const result = await this.prisma.student.update({ where: { id }, data: { deleted_at: new Date() } });
		return result !== null;
	}

	async updateStudentClass(): Promise<void> {
		// Increment class for students with 1 <= class < 11 (class 0 is excluded)
		await this.prisma.student.updateMany({
			where: {
				deleted_at: null,
				class: { gt: 0, lt: 11 },
			},
			data: { class: { increment: 1 } },
		});
	}

	private mapStudentToView(student: Student): StudentDto {
		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
			age: calculateAgeFromBirthDate(student.birth_date),
			created_at: student.created_at,
			deleted_at: student.deleted_at || null,
			teacher_id: student.teacher_id || null,
			timezone: student.timezone as Timezone,
			marketing_consent: student.marketing_consent,
			marketing_consent_at: student.marketing_consent_at,
			// Отдельной колонки нет: приняты — значит дата есть.
			terms_accepted: student.terms_accepted_at !== null,
			terms_accepted_at: student.terms_accepted_at,
			balance_currency: student.balance_currency as Currency | null,
			balance: student.balance,
			discount: student.discount,
		};
	}

	private mapStudentToExtendedView(student: Student, uniquePlans: Plan[]): StudentExtendedDto {
		return {
			...this.mapStudentToView(student),
			actualPlans: uniquePlans.map(this.mapPlanToView),
			bookUntilCancellation: student.bookUntilCancellation,
			// telegrams: student.telegrams,
			notifyAboutBirthday: student.notifyAboutBirthday,
			notifyAboutLessons: student.notifyAboutLessons,
		};
	}
	private mapPlanToView(plan: Plan): PlanDto {
		return {
			id: plan.id,
			plan_name: plan.plan_name,
			plan_price: plan.plan_price,
			plan_currency: plan.plan_currency as Currency,
			duration: plan.duration,
			plan_type: plan.plan_type,
			deleted_at: plan.deleted_at || null,
			created_at: plan.created_at,
		};
	}
}