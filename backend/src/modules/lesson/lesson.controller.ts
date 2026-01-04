import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CancelLessonDto } from './dto/cancel-lesson.dto';
import { LessonService } from './lesson.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from 'src/core/guards/jwt-access.guard';
import { AdminAccessGuard } from 'src/core/guards/admin-access.guard';
import { SingleLessonInputDto } from './dto/single-lesson.input.dto';
import { CreateSingleLessonSwagger } from 'src/core/decorators/swagger/lesson/create-single-lesson-swagger.decorator';
import { LessonOutputDto } from './dto/lesson.output.dto';
import { ExtractTeacherFromRequest } from 'src/core/decorators/param/extract-teacher-from-request';
import { TeacherRoleEnum } from '../teacher/dto/teacherRole';
import { GetLessonsForPeriodSwagger } from 'src/core/decorators/swagger/lesson/get-lessons-swagger.decorator';
import { JwtPayloadDto } from '../auth/dto/jwt.payload.dto';
import { RegularLessonsInputDto } from './dto/regular-lesson.input.dto';
import { CreateRegularLessonsSwagger } from 'src/core/decorators/swagger/lesson/create-regular-lessons-swagger.decorator';
import { GetAssignedLessonsSwagger } from 'src/core/decorators/swagger/lesson/get-assigned-lessons-swagger.decorator';
import { ChangeTeacherDto } from './dto/change-teacher.dto';
import { ChangeTeacherSwagger } from 'src/core/decorators/swagger/lesson/change-teacher-swagger.decorator';
import { CancelLessonSwagger } from 'src/core/decorators/swagger/lesson/cancel-lesson-swagger.decorator';
import { GetLessonsForRescheduleSwagger } from 'src/core/decorators/swagger/lesson/get-rescheduled-lessons-swagger.decorator';
import { RescheduledLessonInputDto } from './dto/rescheduled-lesson.input.dto';
import { CreateRescheduledLessonSwagger } from 'src/core/decorators/swagger/lesson/create-rescheduled-lesson-swagger.decorator';
import { ManageFreeLessonStatusDto } from './dto/manage-free-lesson.input.dto';
import { FreeLessonSwagger } from 'src/core/decorators/swagger/lesson/free-lesson-swagger.decorator';
import { DeleteLessonSwagger } from 'src/core/decorators/swagger/lesson/delete-lesson-swagger.decorator';
import { GetLessonsForPeriodAndStudentSwagger } from '../../core/decorators/swagger/lesson/get-lessons-for-period-and-student-swagger.decorator';
import { StudentLessonsOutputDto } from './dto/student-lessons.output.dto';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonController {
	constructor(private readonly lessonService: LessonService) { }

	@GetLessonsForPeriodSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findLessonsForPeriod(@Query('start_date') start_date: string, @Query('end_date') end_date: string,@Query('teacher_id') teacher_id: string | undefined, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<LessonOutputDto[]> {
		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher.id);
		} else {
			if (!teacher_id) {
				return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher.id);
			}
			return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher_id);
		}
	}

	@GetLessonsForPeriodAndStudentSwagger()
	@Get('student/:student_id')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findLessonsForPeriodAndStudent(@Param('student_id') student_id: string, @Query('start_date') start_date: string, @Query('end_date') end_date: string, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<StudentLessonsOutputDto> {
		return await this.lessonService.findLessonsForPeriodAndStudent(+student_id, start_date, end_date, teacher);
	}

	@GetLessonsForRescheduleSwagger()
	@Get('rescheduled')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findLessonsForReschedule(@Query('teacher_id') teacher_id: string, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<LessonOutputDto[]> {
		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			return await this.lessonService.findLessonsForReschedule(+teacher.id);
		} else {
			if (!teacher_id) {
				return await this.lessonService.findLessonsForReschedule(+teacher.id);
			}
			return await this.lessonService.findLessonsForReschedule(+teacher_id);
		}
	}


	@CreateSingleLessonSwagger()
	@Post('single')
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async createSingleLessonByAdmin(@Body() singleLessonInputDto: SingleLessonInputDto) {
		return await this.lessonService.createSingleLessonByAdmin(singleLessonInputDto);
	}

	@CreateRescheduledLessonSwagger()
	@Post('rescheduled')
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard)
	async createRescheduledLesson(@Body() rescheduledLessonInputDto: RescheduledLessonInputDto, @ExtractTeacherFromRequest() teacher: JwtPayloadDto) {
		return await this.lessonService.createRescheduledLesson(rescheduledLessonInputDto, teacher);
	}

	@CreateRegularLessonsSwagger()
	@Post('regular/:student_id')
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async createRegularLesson(@Body() regularLessonsInputDto: RegularLessonsInputDto, @Param('student_id') student_id: string) {
		return await this.lessonService.createRegularLessons(regularLessonsInputDto, +student_id);
	}

	@GetAssignedLessonsSwagger()
	@Get('assigned')
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findLessonsByStartDate(@Query('start_date') start_date: string, @Query('teacher_id') teacher_id: string | undefined, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<LessonOutputDto[]> {
		// For admin, allow specifying teacher_id, otherwise use current teacher
		const date = new Date(start_date);
		const targetTeacherId = teacher.role === TeacherRoleEnum.ADMIN && teacher_id ? +teacher_id : +teacher.id;
		return await this.lessonService.findLessonsByStartDate(date, targetTeacherId);
	}

	@ChangeTeacherSwagger()
	@Patch(':id/teacher')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async changeTeacher(@Param('id') id: string, @Body() changeTeacherDto: ChangeTeacherDto): Promise<void> {
		await this.lessonService.changeTeacher(+id, changeTeacherDto);
	}

	@CancelLessonSwagger()
	@Patch(':id/cancel')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard)
	async cancelLesson(@Param('id') id: string, @Body() cancelLessonDto: CancelLessonDto, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<void> {
		await this.lessonService.cancelLesson(+id, cancelLessonDto, teacher);
	}

	@FreeLessonSwagger()
	@Patch(':id/free')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async manageFreeLessonStatus(@Param('id') id: string, @Body() manageFreeLessonStatusDto: ManageFreeLessonStatusDto): Promise<void> {
		await this.lessonService.manageFreeLessonStatus(+id, manageFreeLessonStatusDto);
	}

	@DeleteLessonSwagger()
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async deleteLesson(@Param('id') id: string): Promise<void> {
		await this.lessonService.deleteLesson(+id);
	}
}
