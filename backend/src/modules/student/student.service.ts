import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentRepository } from './student.repository';
import { StudentOutputDto, StudentExtendedOutputDto } from './dto/student.output.dto';
import { TeacherService } from '../teacher/teacher.service';
import { FilterStudentQuery } from './dto/filter.query.dto';

@Injectable()
export class StudentService {
	constructor(private readonly studentRepository: StudentRepository, private readonly teacherService: TeacherService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentOutputDto> {
		const teacher = await this.teacherService.getTeacherById(createStudentDto.teacher_id);
		if (!teacher) {
			throw new NotFoundException("Teacher not found");
		}
		return await this.studentRepository.create(createStudentDto);
	}

	async findAllForCurrentTeacher(teacher_id: number, filter: FilterStudentQuery): Promise<StudentOutputDto[]> {
		return await this.studentRepository.getStudentsByTeacherId(teacher_id, filter);
	}

	async findOne(id: number): Promise<StudentExtendedOutputDto> {
		const student = await this.studentRepository.getStudent(id);
		if (!student) {
			throw new NotFoundException("Student not found");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Student already deleted");
		}
		return student;
	}

	async update(id: number, updateStudentDto: UpdateStudentDto): Promise<void> {
		const student = await this.studentRepository.getStudent(id);
		if (!student) {
			throw new NotFoundException("Student not found");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Student already deleted");
		}
		const isUpdated = await this.studentRepository.updateStudent(id, updateStudentDto);
		if (!isUpdated) {
			throw new NotFoundException("Student not found");
		}
	}

	// async pay(id: number, sum: number) {
	// 	const student = await this.prisma.student.update({
	// 		where: { id },
	// 		data: { balance: { increment: sum } },
	// 	});

	// 	const lessons = await this.prisma.lesson.findMany({
	// 		where: {
	// 			student_id: id,
	// 			is_regular: true,
	// 			is_paid: false,
	// 		}, // может ли быть кейс у одного ребенка разные планы?
	// 	});

	// 	return true
	// }


	// async getTelegramLink(id: number): Promise<{ link: string }> {
	// 	const uuid = randomUUID()
	// 	const expiredAt = new Date(Date.now() + 1000 * 60 * 15);
	// 	await this.prisma.telegramToken.create({
	// 		data: {
	// 			token: uuid,
	// 			student_id: id,
	// 			expired_at: expiredAt,
	// 		},
	// 	})
	// 	return { link: `https://t.me/otoseeker_bot?start=${uuid}` }
	// }

	async remove(id: number): Promise<void> {
		const student = await this.studentRepository.getStudent(id);
		if (!student) {
			throw new NotFoundException("Student not found");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Student already deleted");
		}
		const isDeleted = await this.studentRepository.deleteStudent(id);
		if (!isDeleted) {
			throw new NotFoundException("Student not found");
		}
	}
}
