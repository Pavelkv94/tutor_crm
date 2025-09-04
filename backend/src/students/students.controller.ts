import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ApiBadRequestResponse, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentOutputDto } from './dto/student.output.dto';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}


	@ApiOperation({ summary: 'Create a student' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'The student has been successfully created.', type: StudentOutputDto })
	@ApiBadRequestResponse({ description: 'Bad request.' })
	@ApiBody({ description: 'Student data', type: CreateStudentDto })
	@HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

	@HttpCode(HttpStatus.OK)
  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

	@HttpCode(HttpStatus.OK)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(+id, updateStudentDto);
  }

	@HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(+id);
  }
}
