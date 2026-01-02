import { PrismaService } from "src/core/prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { Injectable } from "@nestjs/common";
import { Student } from "@prisma/client";
import { StudentOutputDto, StudentExtendedOutputDto } from "./dto/student.output.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { FilterStudentQuery } from "./dto/filter.query.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class StudentRepository {
	constructor(private readonly prisma: PrismaService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentOutputDto> {
		const student = await this.prisma.student.create({
			data: {
				...createStudentDto,
				birth_date: new Date(createStudentDto.birth_date),
			},
		});
		return this.mapStudentToView(student);
	}

	// async getStudents(): Promise<StudentOutputDto[]> {
	// 	const students = await this.prisma.student.findMany({
	// 		include: {
	// 			telegrams: true,
	// 			lessons: true,
	// 		},
	// 		where: {
	// 			deleted_at: null,
	// 		},
	// 		orderBy: {
	// 			name: 'asc',
	// 		},
	// 	});
	// 	return students.map(this.mapStudentToView);
	// }

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
			orderBy: {
				name: 'asc',
			},
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
		if (!student) {
			return null;
		}

		return this.mapStudentToExtendedView(student);
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

	private mapStudentToView(student: Student): StudentOutputDto {
		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
			created_at: student.created_at,
			deleted_at: student.deleted_at || null,
		};
	}

	private mapStudentToExtendedView(student: Student): StudentExtendedOutputDto {
		return {
			...this.mapStudentToView(student),
			balance: student.balance,
			bookUntilCancellation: student.bookUntilCancellation,
			// telegrams: student.telegrams,
			notifyAboutBirthday: student.notifyAboutBirthday,
			notifyAboutLessons: student.notifyAboutLessons,
		};
	}
}