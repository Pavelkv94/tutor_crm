import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CancelLessonDto } from './dto/cancel-lesson.dto';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
	@HttpCode(HttpStatus.CREATED)
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
	@HttpCode(HttpStatus.OK)
  findLessonsForPeriod(@Query('start_date') start_date: string, @Query('end_date') end_date: string) {
    return this.lessonsService.findLessonsForPeriod(start_date, end_date);
  }

	@Get('assigned')
	@HttpCode(HttpStatus.OK)
	findLessonsByStartDate(@Query('start_date') start_date: string) {
		return this.lessonsService.findLessonsByStartDate(start_date);
	}

	@Patch(':id/cancel')
	@HttpCode(HttpStatus.NO_CONTENT)
	cancelLesson(@Param('id') id: string, @Body() cancelLessonDto: CancelLessonDto) {
		return this.lessonsService.cancelLesson(+id, cancelLessonDto);
	}

  @Patch(':id')
	update(@Param('id') id: string,) {
		return this.lessonsService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(+id);
  }
}
