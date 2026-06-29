import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from '@/modules/student/interface/dto/requests/create-student.dto';
import { UpdateStudentDto } from '@/modules/student/interface/dto/requests/update-student.dto';
import { StudentRepository } from '../infrastructure/student.repository';
import { StudentDto, StudentExtendedDto } from '../interface/dto/responses/student.dto';
import { TeacherService } from '../../teacher/application/teacher.service';
import { FilterStudentQuery } from '../interface/dto/requests/filter.query.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class StudentService {
	constructor(private readonly studentRepository: StudentRepository, private readonly teacherService: TeacherService) { }

	async create(createStudentDto: CreateStudentDto): Promise<StudentDto> {
		const teacher = await this.teacherService.getTeacherById(createStudentDto.teacher_id);
		if (!teacher) {
			throw new NotFoundException("Преподаватель не найден");
		}
		return await this.studentRepository.create(createStudentDto);
	}

	async findAllForCurrentTeacher(teacher_id: number, filter: FilterStudentQuery): Promise<StudentDto[]> {
		return await this.studentRepository.getStudentsByTeacherId(teacher_id, filter);
	}

	async findAllActiveWithBirthdays(): Promise<any[]> {
		return await this.studentRepository.getActiveStudentsWithBirthdays();
	}

	async findById(id: number): Promise<StudentExtendedDto> {
		const student = await this.studentRepository.getStudent(id);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}
		return student;
	}

	async update(id: number, updateStudentDto: UpdateStudentDto): Promise<void> {
		const student = await this.studentRepository.getStudent(id);
		if (!student) {
			throw new NotFoundException("Студент не найден");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Студент уже удален");
		}
		const isUpdated = await this.studentRepository.updateStudent(id, updateStudentDto);
		if (!isUpdated) {
			throw new NotFoundException("Студент не найден");
		}
	}

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
			throw new NotFoundException("Студент не найден");
		}
		if (student.deleted_at) {
			throw new BadRequestException("Студент уже удален");
		}
		const isDeleted = await this.studentRepository.deleteStudent(id);
		if (!isDeleted) {
			throw new NotFoundException("Студент не найден");
		}
	}


	@Cron('0 15 30 8 *') // 30 августа в 15:00
	async updateStudentClass() {
		await this.studentRepository.updateStudentClass();
	}
}
