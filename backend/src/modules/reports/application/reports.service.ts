import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LessonService } from '@/modules/lesson/application/lesson.service';
import { Response } from 'express';
import { TeacherService } from '@/modules/teacher/application/teacher.service';
import { StudentService } from '@/modules/student/application/student.service';
import { TelegramService } from '@/modules/telegram/application/telegram.service';
import { buildScheduleExcel } from '@/modules/reports/schedule-excel.util';
import { buildStudentsExcel } from '@/modules/reports/students-excel.util';
import { FilterStudentQuery } from '@/modules/student/interface/dto/requests/filter.query.dto';
import { LessonStatusEnum } from '@/modules/lesson/interface/dto/lesson-status.enum';
import { SalaryDataOutputDto } from '@/modules/reports/interface/dto/responses/salary.output.dto';
import { SalaryInvoiceDto } from '@/modules/reports/interface/dto/requests/salary-invoice.input.dto';
import { SalaryInvoiceOutputDto } from '@/modules/reports/interface/dto/responses/salary-invoice.output.dto';
import { SalaryInvoiceDeliveryEnum } from '@/modules/reports/interface/dto/salary-invoice-delivery.enum';
import {
	buildSalaryInvoiceFileName,
	buildSalaryInvoicePdf,
	formatInvoiceAmount,
	formatInvoiceDate,
	SalaryInvoiceLineView,
	SalaryInvoiceView,
	toReportDate,
} from '@/modules/reports/salary-invoice-pdf.util';
import {
	SALARY_INVOICE_BUYER,
	SALARY_INVOICE_CURRENCY,
	SALARY_INVOICE_EXTRA_SERVICE,
	SALARY_INVOICE_LABELS,
	SALARY_INVOICE_LESSONS_SERVICE,
	SALARY_INVOICE_PAYMENT_TERM,
} from '@/modules/reports/salary-invoice.constants';

@Injectable()
export class ReportsService {
	constructor(
		private readonly lessonService: LessonService,
		private readonly teacherService: TeacherService,
		private readonly studentService: StudentService,
		private readonly telegramService: TelegramService,
	) {}

	async generateScheduleExcel(
		startDate: string,
		endDate: string,
		teacherId: number,
		res: Response
	): Promise<void> {
		// Get teacher information
		const teacher = await this.teacherService.getTeacherById(teacherId);
		const teacherName = teacher?.name || 'Неизвестный преподаватель';

		// Get lessons for the period
		const lessons = await this.lessonService.findLessonsForPeriod(
			startDate,
			endDate,
			teacherId
		);

		// Build Excel workbook using utility function
		const workbook = buildScheduleExcel(lessons, startDate, endDate, teacherName);

		// Set response headers
		const fileName = `schedule_${startDate}_${endDate}.xlsx`;
		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${encodeURIComponent(fileName)}"`
		);

		// Write workbook to response
		await workbook.xlsx.write(res);
		res.end();
	}

	async generateStudentsExcel(
		teacherId: number,
		filter: FilterStudentQuery,
		res: Response
	): Promise<void> {
		// Get teacher information
		const teacher = await this.teacherService.getTeacherById(teacherId);
		const teacherName = teacher?.name || 'Неизвестный преподаватель';

		// Get students for the teacher with filter
		const students = await this.studentService.findAllForCurrentTeacher(teacherId, filter);

		// Build Excel workbook using utility function
		const workbook = buildStudentsExcel(students, teacherName);

		// Set response headers
		const filterText = filter === FilterStudentQuery.ALL ? 'all' : filter === FilterStudentQuery.ACTIVE ? 'active' : 'deleted';
		const fileName = `students_${filterText}_${teacherId}.xlsx`;
		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${encodeURIComponent(fileName)}"`
		);

		// Write workbook to response
		await workbook.xlsx.write(res);
		res.end();
	}

	async getDataForSalary(start_date: string, end_date: string, teacher_id: number): Promise<SalaryDataOutputDto> {

		const lessons = await this.lessonService.findLessonsForPeriodForSalary(start_date, end_date, teacher_id);

		const teacher = await this.teacherService.getTeacherById(teacher_id);
		if (!teacher) {
			throw new NotFoundException(`Teacher with id ${teacher_id} not found`);
		}

		const completedLessons = lessons.filter(lesson => (lesson.status === LessonStatusEnum.COMPLETED_PAID || lesson.status === LessonStatusEnum.COMPLETED_UNPAID || lesson.status === LessonStatusEnum.MISSED) && lesson.teacher.id === teacher_id);

		const totalLessons = completedLessons.length;



		const lessonsByPlan = completedLessons.reduce((acc, lesson) => {
			acc[lesson.plan.id] = (acc[lesson.plan.id] || 0) + 1;
			return acc;
		}, {});


		const data: SalaryDataOutputDto = {
			total_lessons: totalLessons,
			teacher: teacher,
			lessons: Object.entries(lessonsByPlan).map(([planId, lessonsCount]) => {
				const plan = lessons.find(lesson => lesson.plan.id === +planId);
				if (!plan) {
					throw new NotFoundException(`Plan with id ${planId} not found`);
				}
				return {
					plan_name: plan?.plan.plan_name,
					plan_price: plan?.plan.plan_price,
					plan_currency: plan?.plan.plan_currency,
					duration: plan?.plan.duration,
					plan_type: plan?.plan.plan_type,
					lessons_count: lessonsCount as number,
				};
			}),
		};

		return data;
	}

	/**
	 * Формирует счёт (rachunek) преподавателя за период и доставляет его выбранными способами.
	 *
	 * Суммы считаются здесь, а не на фронте: в PDF и в форме администратора должны стоять
	 * одинаковые цифры. Ставки за занятие задаёт администратор — система их не хранит.
	 */
	async generateSalaryInvoice(dto: SalaryInvoiceDto): Promise<SalaryInvoiceOutputDto> {
		const salaryData = await this.getDataForSalary(dto.start_date, dto.end_date, dto.teacher_id);
		const billing = salaryData.teacher.billing_details;

		const missingFields = [
			[billing?.full_name_latin, 'ФИО латиницей'],
			[billing?.address, 'адрес'],
			[billing?.passport, 'паспорт'],
			[billing?.email, 'email'],
			[billing?.bank_name, 'название банка'],
			[billing?.bank_account, 'номер счёта'],
		]
			.filter(([value]) => !value)
			.map(([, label]) => label);

		if (missingFields.length > 0) {
			throw new BadRequestException(
				`Не заполнены реквизиты преподавателя: ${missingFields.join(', ')}. Укажите их в карточке преподавателя.`,
			);
		}

		const ratesByPlan = new Map(dto.lesson_rates.map((rate) => [rate.plan_name, rate.rate]));
		const lessonsTotal = salaryData.lessons.reduce(
			(sum, lesson) => sum + (ratesByPlan.get(lesson.plan_name) ?? 0) * lesson.lessons_count,
			0,
		);
		const extraTotal = dto.extra_amount ?? 0;
		const total = lessonsTotal + extraTotal;

		if (total <= 0) {
			throw new BadRequestException('Нечего выставлять: сумма счёта равна нулю');
		}

		const periodStart = toReportDate(dto.start_date);
		const periodEnd = toReportDate(dto.end_date);
		const invoiceDate = toReportDate(dto.invoice_date);
		const period = `${formatInvoiceDate(periodStart)} – ${formatInvoiceDate(periodEnd)}`;

		const lines: SalaryInvoiceLineView[] = [];
		if (lessonsTotal > 0) {
			lines.push({
				index: lines.length + 1,
				description_pl: SALARY_INVOICE_LESSONS_SERVICE.pl,
				description_ru: SALARY_INVOICE_LESSONS_SERVICE.ru,
				period,
				amount: formatInvoiceAmount(lessonsTotal),
			});
		}
		// Нулевые доп. услуги строкой в счёте не показываются
		if (extraTotal > 0) {
			lines.push({
				index: lines.length + 1,
				description_pl: SALARY_INVOICE_EXTRA_SERVICE.pl,
				description_ru: SALARY_INVOICE_EXTRA_SERVICE.ru,
				period,
				amount: formatInvoiceAmount(extraTotal),
			});
		}

		const fullNameLatin = billing?.full_name_latin as string;
		const view: SalaryInvoiceView = {
			invoice_number: dto.invoice_number,
			invoice_date: formatInvoiceDate(invoiceDate),
			issuer: {
				full_name: fullNameLatin,
				address: billing?.address as string,
				passport: billing?.passport as string,
				email: billing?.email as string,
			},
			buyer: {
				name: SALARY_INVOICE_BUYER.name,
				nip: SALARY_INVOICE_BUYER.nip,
				address: SALARY_INVOICE_BUYER.address,
				email: SALARY_INVOICE_BUYER.email,
			},
			lines,
			currency: SALARY_INVOICE_CURRENCY,
			total: formatInvoiceAmount(total),
			payment: {
				// Получатель платежа в бланке — всегда сам преподаватель
				recipient: fullNameLatin,
				bank_name: billing?.bank_name as string,
				bank_account: billing?.bank_account as string,
				term: `${SALARY_INVOICE_PAYMENT_TERM.pl} / ${SALARY_INVOICE_PAYMENT_TERM.ru}`,
			},
			labels: {
				vat_pl: SALARY_INVOICE_LABELS.vatNote.pl,
				vat_ru: SALARY_INVOICE_LABELS.vatNote.ru,
				signature_pl: SALARY_INVOICE_LABELS.signatureNote.pl,
				signature_ru: SALARY_INVOICE_LABELS.signatureNote.ru,
			},
		};

		const pdf = await buildSalaryInvoicePdf(view);
		const fileName = buildSalaryInvoiceFileName({
			invoiceDate,
			fullNameLatin,
			invoiceNumber: dto.invoice_number,
		});

		const caption =
			`<b>Счёт ${dto.invoice_number}</b>\n` +
			`Преподаватель: ${salaryData.teacher.name}\n` +
			`Период: ${period}\n` +
			`Итого: ${formatInvoiceAmount(total)} ${SALARY_INVOICE_CURRENCY}`;

		const sentToAdmin = dto.delivery.includes(SalaryInvoiceDeliveryEnum.TELEGRAM_ADMIN);
		if (sentToAdmin) {
			await this.telegramService.sendDocumentToAdmin({ buffer: pdf, fileName }, caption);
		}

		const sentToTeacher = dto.delivery.includes(SalaryInvoiceDeliveryEnum.TELEGRAM_TEACHER);
		if (sentToTeacher) {
			await this.telegramService.sendDocumentToTeacher(dto.teacher_id, { buffer: pdf, fileName }, caption);
		}

		return {
			file_name: fileName,
			total,
			currency: SALARY_INVOICE_CURRENCY,
			sent_to_admin: sentToAdmin,
			sent_to_teacher: sentToTeacher,
		};
	}
}
