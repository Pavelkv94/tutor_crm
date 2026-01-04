import {
	Controller,
	Get,
	Query,
	Res,
	UseGuards,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAccessGuard } from 'src/core/guards/jwt-access.guard';
import { ExtractTeacherFromRequest } from 'src/core/decorators/param/extract-teacher-from-request';
import { JwtPayloadDto } from '../auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../teacher/dto/teacherRole';
import { ApiTags } from '@nestjs/swagger';
import { FilterStudentQuery } from '../student/dto/filter.query.dto';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAccessGuard)
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get('schedule/download')
	@HttpCode(HttpStatus.OK)
	async downloadSchedule(
		@Query('start_date') start_date: string,
		@Query('end_date') end_date: string,
		@Query('teacher_id') teacher_id: string | undefined,
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
		@Res() res: Response,
	): Promise<void> {
		// Determine which teacher ID to use
		let targetTeacherId: number;
		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			targetTeacherId = +teacher.id;
		} else {
			if (!teacher_id) {
				targetTeacherId = +teacher.id;
			} else {
				targetTeacherId = +teacher_id;
			}
		}

		await this.reportsService.generateScheduleExcel(
			start_date,
			end_date,
			targetTeacherId,
			res,
		);
	}

	@Get('students/download')
	@HttpCode(HttpStatus.OK)
	async downloadStudents(
		@Query('filter') filter: FilterStudentQuery = FilterStudentQuery.ALL,
		@Query('teacher_id') teacher_id: string | undefined,
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
		@Res() res: Response,
	): Promise<void> {
		// Determine which teacher ID to use
		let targetTeacherId: number;
		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			targetTeacherId = +teacher.id;
		} else {
			if (!teacher_id) {
				targetTeacherId = +teacher.id;
			} else {
				targetTeacherId = +teacher_id;
			}
		}

		await this.reportsService.generateStudentsExcel(
			targetTeacherId,
			filter,
			res,
		);
	}
}

