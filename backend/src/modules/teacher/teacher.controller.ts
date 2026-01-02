
import { ApiOperation } from "@nestjs/swagger";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { TeacherService } from "./teacher.service";
import { Controller, HttpCode, HttpStatus, Get, Body, Post, UseGuards, Param, Patch, Delete, Query } from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { GetTeachersSwagger } from "src/core/decorators/swagger/teachers/get-teachers-swagger.decorator";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { CreateTeacherSwagger } from "src/core/decorators/swagger/teachers/create-teacher-swagger.decorator";
import { UpdateTeacherSwagger } from "src/core/decorators/swagger/teachers/update-teacher-swagger.decorator";
import { DeleteTeacherSwagger } from "src/core/decorators/swagger/teachers/delete-teacher-swagger.decorator";
import { JwtAccessGuard } from "src/core/guards/jwt-access.guard";
import { AdminAccessGuard } from "src/core/guards/admin-access.guard";
import { UpdateTeacherDto } from "./dto/update-teacher.input.dto";
import { FilterTeacherQuery } from "./dto/filter.query.dto";


@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class TeacherController {
	constructor(private readonly teacherService: TeacherService) {}

	@GetTeachersSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	async getTeachers(@Query('filter') filter: FilterTeacherQuery = FilterTeacherQuery.ALL): Promise<TeacherOutputDto[]> {
		return await this.teacherService.getTeachers(filter);
	}

	@CreateTeacherSwagger()
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createTeacher(@Body() createTeacherDto: CreateTeacherDto): Promise<TeacherOutputDto> {
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