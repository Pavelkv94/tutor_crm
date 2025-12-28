import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ApiTags } from '@nestjs/swagger';
import { StudentOutputDto } from './dto/student.output.dto';
import { CreateStudentSwagger } from '../../core/decorators/swagger/student/create-student-swagger.decorator';
import { JwtAccessGuard } from 'src/core/guards/jwt-access.guard';
import { AdminAccessGuard } from 'src/core/guards/admin-access.guard';
import { GetStudentsSwagger } from '../../core/decorators/swagger/student/get-students-swagger.decorator';
import { GetStudentExtendedSwagger } from 'src/core/decorators/swagger/student/get-student-extended-swagger.decorator';
import { StudentExtendedOutputDto } from './dto/student.output.dto';
import { UpdateStudentSwagger } from '../../core/decorators/swagger/student/update-student-swagger.decorator';
import { DeleteStudentSwagger } from '../../core/decorators/swagger/student/delete-student-swagger.decorator';

@ApiTags('Students')
@Controller('students')
export class StudentController {
	constructor(private readonly studentsService: StudentService) { }


	@CreateStudentSwagger()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@Post()
	async create(@Body() createStudentDto: CreateStudentDto): Promise<StudentOutputDto> {
		return await this.studentsService.create(createStudentDto);
	}

	@GetStudentsSwagger()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	@Get()
	async findAll(): Promise<StudentOutputDto[]> {
		return await this.studentsService.findAll();
	}

	@GetStudentExtendedSwagger()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@Get(':id')
	async findOne(@Param('id') id: string): Promise<StudentExtendedOutputDto> {
		return await this.studentsService.findOne(+id);
	}

	@UpdateStudentSwagger()
	@HttpCode(HttpStatus.NO_CONTENT)
	@Patch(':id')
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto): Promise<void> {
		await this.studentsService.update(+id, updateStudentDto);
	}

	@DeleteStudentSwagger()
	@HttpCode(HttpStatus.NO_CONTENT)
	@Delete(':id')
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	async delete(@Param('id') id: string): Promise<void> {
		await this.studentsService.remove(+id);
	}

	// @HttpCode(HttpStatus.OK)
	// @Post(':id/pay')
	// pay(@Param('id') id: string, @Body() payDto: { sum: number }) {
	// 	return this.studentsService.pay(+id, payDto.sum);
	// }

	// @HttpCode(HttpStatus.OK)
	// @Get(':id/telegram-link')
	// getTelegramLink(@Param('id') id: string) {
	// 	return this.studentsService.getTelegramLink(+id);
	// }

}
