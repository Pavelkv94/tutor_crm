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
		// Валюта баланса здесь не меняется вовсе: её единственный источник — BalanceService,
		// см. комментарий в UpdateStudentDto.
		const { terms_accepted, ...rest } = updateStudentDto;
		const isUpdated = await this.studentRepository.updateStudent(id, {
			...rest,
			...this.buildConsentPatch(student, updateStudentDto),
		});
		if (!isUpdated) {
			throw new NotFoundException("Студент не найден");
		}
	}

	/**
	 * Согласия хранятся вместе с датой ответа, но админ правит только сам ответ.
	 *
	 * Дата переставляется, **только если значение изменилось**: форма редактирования шлёт
	 * `marketing_consent` при каждом сохранении, и штамповать дату безусловно значило бы
	 * закрыть вопрос у всех, кого просто открыли и сохранили, — дропдаун на странице оплаты
	 * тогда не показался бы никогда.
	 */
	private buildConsentPatch(
		student: StudentExtendedDto,
		dto: UpdateStudentDto,
	): { marketing_consent_at?: Date | null; terms_accepted_at?: Date | null } {
		const patch: { marketing_consent_at?: Date | null; terms_accepted_at?: Date | null } = {};

		if (dto.marketing_consent !== undefined && dto.marketing_consent !== student.marketing_consent) {
			patch.marketing_consent_at = new Date();
		}
		if (dto.terms_accepted === true && !student.terms_accepted) {
			patch.terms_accepted_at = new Date();
		}
		// Снятие галочки возвращает ученика в состояние «условия не приняты»:
		// на следующей оплате он увидит их снова.
		if (dto.terms_accepted === false && student.terms_accepted) {
			patch.terms_accepted_at = null;
		}

		return patch;
	}

	/**
	 * Фиксирует согласия, полученные на странице оплаты. Побеждает первый ответ: если поле
	 * уже заполнено (ученик ответил раньше или админ поправил вручную), повторная доставка
	 * события Stripe его не перезапишет.
	 */
	async recordConsentsFromCheckout(studentId: number, consents: { termsAccepted?: boolean; marketingConsent?: boolean }): Promise<void> {
		await this.studentRepository.applyCheckoutConsents(studentId, consents, new Date());
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
