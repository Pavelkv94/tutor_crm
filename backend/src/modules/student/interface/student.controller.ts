import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { StudentService } from '@/modules/student/application/student.service';
import { CreateStudentDto } from '@/modules/student/interface/dto/requests/create-student.dto';
import { UpdateStudentDto } from '@/modules/student/interface/dto/requests/update-student.dto';
import { ApiTags } from '@nestjs/swagger';
import { StudentDto } from '@/modules/student/interface/dto/responses/student.dto';
import { CreateStudentSwagger } from '@/shared/decorators/swagger/student/create-student-swagger.decorator';
import { JwtAccessGuard } from '@/shared/guards/jwt-access.guard';
import { AdminAccessGuard } from '@/shared/guards/admin-access.guard';
import { GetStudentsSwagger } from '@/shared/decorators/swagger/student/get-students-swagger.decorator';
import { GetStudentExtendedSwagger } from '@/shared/decorators/swagger/student/get-student-extended-swagger.decorator';
import { StudentExtendedDto } from '@/modules/student/interface/dto/responses/student.dto';
import { UpdateStudentSwagger } from '@/shared/decorators/swagger/student/update-student-swagger.decorator';
import { DeleteStudentSwagger } from '@/shared/decorators/swagger/student/delete-student-swagger.decorator';
import { ExtractTeacherFromRequest } from '@/shared/decorators/param/extract-teacher-from-request';
import { JwtPayloadDto } from '../../auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '@/modules/teacher/interface/dto/teacherRole';
import { FilterStudentQuery } from '@/modules/student/interface/dto/requests/filter.query.dto';

@ApiTags('Students')
@Controller('students')
export class StudentController {
	constructor(private readonly studentsService: StudentService) { }


	@CreateStudentSwagger()
	@HttpCode(HttpStatus.CREATED)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@Post()
	async create(@Body() createStudentDto: CreateStudentDto): Promise<StudentDto> {
		return await this.studentsService.create(createStudentDto);
	}

	@GetStudentsSwagger()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard)
	@Get()
	async findAllForCurrentTeacher(@ExtractTeacherFromRequest() teacher: JwtPayloadDto, @Query('filter') filter: FilterStudentQuery = FilterStudentQuery.ALL, @Query('teacher_id') teacher_id: string | undefined): Promise<StudentDto[]> {
		if (teacher.role !== TeacherRoleEnum.ADMIN) {
			return await this.studentsService.findAllForCurrentTeacher(+teacher.id, filter);
		} else {
			if (!teacher_id) {
				return await this.studentsService.findAllForCurrentTeacher(+teacher.id, filter);
			}
			return await this.studentsService.findAllForCurrentTeacher(+teacher_id, filter);
		}
	}

	@GetStudentExtendedSwagger()
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@Get(':id')
	async findOne(@Param('id') id: string): Promise<StudentExtendedDto> {
		return await this.studentsService.findById(+id);
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
