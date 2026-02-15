import { PrismaService } from "src/core/prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { Injectable } from "@nestjs/common";
import { Plan, Student } from "@prisma/client";
import { StudentOutputDto, StudentExtendedOutputDto } from "./dto/student.output.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { FilterStudentQuery } from "./dto/filter.query.dto";
import { Prisma } from "@prisma/client";
import { Timezone } from "../teacher/dto/teacher.output.dto";
import { PlanOutputDto } from "../plan/dto/plan.output.dto";

@Injectable()
export class StudentRepository {
	constructor(private readonly prisma: PrismaService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentOutputDto> {
		const student = await this.prisma.student.create({
			data: {
				...createStudentDto,
				birth_date: createStudentDto.birth_date ? new Date(createStudentDto.birth_date) : null,
			},
		});
		return this.mapStudentToView(student);
	}

	async getStudentsByTeacherId(teacher_id: number, filter: FilterStudentQuery): Promise<StudentOutputDto[]> {
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
			orderBy: [{ deleted_at: 'desc' }, { name: 'asc' }],
		});
		return students.map(this.mapStudentToView);
	}

	async getStudent(id: number): Promise<StudentExtendedOutputDto | null> {
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
		// Increment class for students with class < 11
		await this.prisma.student.updateMany({
			where: {
				deleted_at: null,
				class: { lt: 11 }
			},
			data: { class: { increment: 1 } },
		});
	}

	private mapStudentToView(student: Student): StudentOutputDto {
		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
			created_at: student.created_at,
			deleted_at: student.deleted_at || null,
			teacher_id: student.teacher_id || null,
			timezone: student.timezone as Timezone,
		};
	}

	private mapStudentToExtendedView(student: Student, uniquePlans: Plan[]): StudentExtendedOutputDto {
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
	private mapPlanToView(plan: Plan): PlanOutputDto {
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