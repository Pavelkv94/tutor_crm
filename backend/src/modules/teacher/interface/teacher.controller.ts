
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { TeacherService } from "@/modules/teacher/application/teacher.service";
import { Controller, HttpCode, HttpStatus, Get, Body, Post, UseGuards, Param, Patch, Delete, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateTeacherDto } from "@/modules/teacher/interface/dto/requests/create-teacher.input.dto";
import { CreateTeacherSwagger } from '@/shared/decorators/swagger/teacher/create-teacher-swagger.decorator';
import { UpdateTeacherSwagger } from '@/shared/decorators/swagger/teacher/update-teacher-swagger.decorator';
import { DeleteTeacherSwagger } from '@/shared/decorators/swagger/teacher/delete-teacher-swagger.decorator';
import { GetTeachersSwagger } from '@/shared/decorators/swagger/teacher/get-teachers-swagger.decorator';
import { JwtAccessGuard } from '@/shared/guards/jwt-access.guard';
import { AdminAccessGuard } from '@/shared/guards/admin-access.guard';
import { UpdateTeacherDto } from "@/modules/teacher/interface/dto/requests/update-teacher.input.dto";
import { FilterTeacherQuery } from "@/modules/teacher/interface/dto/requests/filter.query.dto";


@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class TeacherController {
	constructor(private readonly teacherService: TeacherService) {}

	@GetTeachersSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	async getTeachers(@Query('filter') filter: FilterTeacherQuery = FilterTeacherQuery.ALL): Promise<TeacherDto[]> {
		return await this.teacherService.getTeachers(filter);
	}

	@CreateTeacherSwagger()
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createTeacher(@Body() createTeacherDto: CreateTeacherDto): Promise<TeacherDto> {
		return await this.teacherService.createTeacher(createTeacherDto);
	}

	@UpdateTeacherSwagger()
	@Patch(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async updateTeacher(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto): Promise<void> {
		await this.teacherService.updateTeacher(+id, updateTeacherDto);
	}

	@DeleteTeacherSwagger()
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteTeacher(@Param('id') id: string): Promise<void> {
		await this.teacherService.deleteTeacher(+id);
	}
}