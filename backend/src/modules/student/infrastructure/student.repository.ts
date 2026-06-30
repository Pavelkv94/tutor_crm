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
import { PaymentCurrency } from '@/modules/student/interface/dto/responses/payment-currency.enum';

@Injectable()
export class StudentRepository {
	constructor(private readonly prisma: PrismaService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentDto> {
		const student = await this.prisma.student.create({
			data: {
				...createStudentDto,
				birth_date: createStudentDto.birth_date ? new Date(createStudentDto.birth_date) : null,
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
			include: {
				telegrams: true,
				lessons: true,
			},
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

	async updateStudent(id: number, updateStudentDto: UpdateStudentDto): Promise<boolean> {
		const updateData: any = { ...updateStudentDto };
		if (updateStudentDto.birth_date) {
			updateData.birth_date = new Date(updateStudentDto.birth_date);
		}
		const result = await this.prisma.student.update({ where: { id }, data: updateData });
		return result !== null;
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
			payment_currency: student.payment_currency as PaymentCurrency,
		};
	}

	private mapStudentToExtendedView(student: Student, uniquePlans: Plan[]): StudentExtendedDto {
		return {
			...this.mapStudentToView(student),
			actualPlans: uniquePlans.map(this.mapPlanToView),
			balance: student.balance,
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
			plan_currency: plan.plan_currency,
			duration: plan.duration,
			plan_type: plan.plan_type,
			deleted_at: plan.deleted_at || null,
			created_at: plan.created_at,
		};
	}
}