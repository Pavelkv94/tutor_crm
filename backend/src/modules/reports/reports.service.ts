import { Injectable, NotFoundException } from '@nestjs/common';
import { LessonService } from '../lesson/lesson.service';
import { Response } from 'express';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';
import { buildScheduleExcel } from './schedule-excel.util';
import { buildStudentsExcel } from './students-excel.util';
import { FilterStudentQuery } from '../student/dto/filter.query.dto';
import { SalaryDataOutputDto } from './dto/salary.output.dto';
import { LessonStatusEnum } from '../lesson/dto/lesson-status.enum';

@Injectable()
export class ReportsService {
	constructor(
		private readonly lessonService: LessonService,
		private readonly teacherService: TeacherService,
		private readonly studentService: StudentService,
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

		const completedLessons = lessons.filter(lesson => (lesson.status === LessonStatusEnum.COMPLETED_PAID || lesson.status === LessonStatusEnum.COMPLETED_UNPAID) && lesson.teacher.id === teacher_id);

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
}

