import { Injectable } from '@nestjs/common';
import { LessonService } from '../lesson/lesson.service';
import { Response } from 'express';
import { TeacherService } from '../teacher/teacher.service';
import { StudentService } from '../student/student.service';
import { buildScheduleExcel } from './schedule-excel.util';
import { buildStudentsExcel } from './students-excel.util';
import { FilterStudentQuery } from '../student/dto/filter.query.dto';

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
}

