import { PrismaService } from "src/core/prisma/prisma.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Student } from "@prisma/client";
import { StudentOutputDto, StudentExtendedOutputDto } from "./dto/student.output.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

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

	async getStudents(): Promise<StudentOutputDto[]> {
		const students = await this.prisma.student.findMany({
			include: {
				telegrams: true,
				lessons: true,
			},
			where: {
				deleted_at: null,
			},
			orderBy: {
				name: 'asc',
			},
		});
		return students.map(this.mapStudentToView);
	}

	async getStudent(id: number): Promise<StudentExtendedOutputDto> {
		const student = await this.prisma.student.findUnique({
			where: { id },
			include: {
				telegrams: true,
			},
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}
		return this.mapStudentToExtendedView(student);
	}

	async updateStudent(id: number, updateStudentDto: UpdateStudentDto): Promise<boolean> {
		const student = await this.prisma.student.findUnique({
			where: { id, deleted_at: null },
		});
		if (!student) {
			throw new NotFoundException("Student not found");
		}
		const updateData: any = { ...updateStudentDto };
		if (updateStudentDto.birth_date) {
			updateData.birth_date = new Date(updateStudentDto.birth_date);
		}
		const result = await this.prisma.student.update({ where: { id }, data: updateData });
		return result !== null;
	}

	async deleteStudent(id: number): Promise<boolean> {
		const student = await this.prisma.student.findUnique({
			where: { id },
		});
		if (!student) {
			throw new NotFoundException("Student not found");
		}
		const result = await this.prisma.student.update({ where: { id }, data: { deleted_at: new Date() } });
		return result !== null;
	}

	private mapStudentToView(student: Student): StudentOutputDto {
		return {
			id: student.id,
			name: student.name,
			class: student.class,
			birth_date: student.birth_date,
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