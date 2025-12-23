
import { ApiOperation } from "@nestjs/swagger";
import { TeacherOutputDto } from "./dto/teacher.output.dto";
import { TeacherService } from "./teacher.service";
import { Controller, HttpCode, HttpStatus, Get, Body, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";
import { GetTeachersSwagger } from "src/core/decorators/swagger/teachers/get-teachers-swagger.decorator";
import { CreateTeacherDto } from "./dto/create-teacher.input.dto";
import { CreateTeacherSwagger } from "src/core/decorators/swagger/teachers/create-teacher-swagger.decorator";
import { JwtAccessGuard } from "src/core/guards/jwt-access.guard";
import { AdminAccessGuard } from "src/core/guards/admin-access.guard";


@ApiTags('Teachers')
@Controller('teachers')
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class TeacherController {
	constructor(private readonly teacherService: TeacherService) {}

	@GetTeachersSwagger()
	@ApiResponse({ status: HttpStatus.OK, description: 'Teachers have been successfully retrieved.', type: [TeacherOutputDto] })
	@Get()
	@HttpCode(HttpStatus.OK)
	async getTeachers(): Promise<TeacherOutputDto[]> {
		return await this.teacherService.getTeachers();
	}

	@CreateTeacherSwagger()
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Teacher has been successfully created.', type: TeacherOutputDto })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createTeacher(@Body() createTeacherDto: CreateTeacherDto): Promise<TeacherOutputDto> {
		return await this.teacherService.createTeacher(createTeacherDto);
	}
	
}