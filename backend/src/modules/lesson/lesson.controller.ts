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
import { TeacherRole } from '../teacher/dto/teacherRole';
import { GetLessonsForPeriodSwagger } from 'src/core/decorators/swagger/lesson/get-lessons-swagger.decorator';
import { JwtPayloadDto } from '../auth/dto/jwt.payload.dto';


@ApiTags('Lessons')
@Controller('lessons')
export class LessonController {
	constructor(private readonly lessonService: LessonService) { }

	@CreateSingleLessonSwagger()
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async createSingleLesson(@Body() singleLessonInputDto: SingleLessonInputDto) {
		return await this.lessonService.createSingleLesson(singleLessonInputDto);
	}

	@GetLessonsForPeriodSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	async findLessonsForPeriod(@Query('start_date') start_date: string, @Query('end_date') end_date: string,@Query('teacher_id') teacher_id: string | undefined, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<LessonOutputDto[]> {
		if (teacher.role !== TeacherRole.ADMIN) {
			return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher.id);
		} else {
			if (!teacher_id) {
				return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher.id);
			}
			return await this.lessonService.findLessonsForPeriod(start_date, end_date, +teacher_id);
		}
	}

	// @Get()
	// @HttpCode(HttpStatus.OK)
	// findLessonsForPeriod(@Query('start_date') start_date: string, @Query('end_date') end_date: string) {
	//   return this.lessonService.findLessonsForPeriod(start_date, end_date);
	// }

	// @Get('assigned')
	// @HttpCode(HttpStatus.OK)
	// findLessonsByStartDate(@Query('start_date') start_date: string) {
	// 	return this.lessonService.findLessonsByStartDate(start_date);
	// }

	// @Patch(':id/cancel')
	// @HttpCode(HttpStatus.NO_CONTENT)
	// cancelLesson(@Param('id') id: string, @Body() cancelLessonDto: CancelLessonDto) {
	// 	return this.lessonService.cancelLesson(+id, cancelLessonDto);
	// }

	// @Patch(':id')
	// update(@Param('id') id: string,) {
	// 	return this.lessonService.update(+id);
	// }

	// @Delete(':id')
	// remove(@Param('id') id: string) {
	//   return this.lessonService.remove(+id);
	// }
}
