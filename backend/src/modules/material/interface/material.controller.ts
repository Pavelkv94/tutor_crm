import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtPayloadDto } from "@/modules/auth/dto/jwt.payload.dto";
import { ExtractTeacherFromRequest } from "@/shared/decorators/param/extract-teacher-from-request";
import { CreateCourseSwagger } from "@/shared/decorators/swagger/material/create-course-swagger.decorator";
import { DeleteCourseSwagger } from "@/shared/decorators/swagger/material/delete-course-swagger.decorator";
import { DeleteFileSwagger } from "@/shared/decorators/swagger/material/delete-file-swagger.decorator";
import { GetCourseAccessSwagger } from "@/shared/decorators/swagger/material/get-course-access-swagger.decorator";
import { GetCourseMaterialsSwagger } from "@/shared/decorators/swagger/material/get-course-materials-swagger.decorator";
import { GetCoursesSwagger } from "@/shared/decorators/swagger/material/get-courses-swagger.decorator";
import { GetMaterialsSizeSwagger } from "@/shared/decorators/swagger/material/get-materials-size-swagger.decorator";
import { GrantCourseAccessSwagger } from "@/shared/decorators/swagger/material/grant-course-access-swagger.decorator";
import { GrantMaterialAccessSwagger } from "@/shared/decorators/swagger/material/grant-material-access-swagger.decorator";
import { OpenMaterialSwagger } from "@/shared/decorators/swagger/material/open-material-swagger.decorator";
import { RenameMaterialSwagger } from "@/shared/decorators/swagger/material/rename-material-swagger.decorator";
import { RevokeCourseAccessSwagger } from "@/shared/decorators/swagger/material/revoke-course-access-swagger.decorator";
import { RevokeMaterialAccessSwagger } from "@/shared/decorators/swagger/material/revoke-material-access-swagger.decorator";
import { UpdateCourseSwagger } from "@/shared/decorators/swagger/material/update-course-swagger.decorator";
import { UploadCompleteSwagger } from "@/shared/decorators/swagger/material/upload-complete-swagger.decorator";
import { UploadInitSwagger } from "@/shared/decorators/swagger/material/upload-init-swagger.decorator";
import { AdminAccessGuard } from "@/shared/guards/admin-access.guard";
import { JwtAccessGuard } from "@/shared/guards/jwt-access.guard";
import { CourseService } from "../application/course.service";
import { MaterialService } from "../application/material.service";
import { CreateCourseDto } from "./dto/requests/create-course.dto";
import { RenameMaterialDto } from "./dto/requests/rename-material.dto";
import { UpdateAccessDto } from "./dto/requests/update-access.dto";
import { UpdateCourseDto } from "./dto/requests/update-course.dto";
import { UploadInitDto } from "./dto/requests/upload-init.dto";
import { CourseAccessTeacherDto } from "./dto/responses/course-access.dto";
import { CourseDto } from "./dto/responses/course.dto";
import { MaterialDto } from "./dto/responses/material.dto";
import { MaterialsSizeDto } from "./dto/responses/materials-size.dto";
import { UploadInitResponseDto } from "./dto/responses/upload-init-response.dto";
import { ViewUrlDto } from "./dto/responses/view-url.dto";
import { mapCourseToResponse } from "./mappers/course-response.mapper";
import { mapMaterialToResponse } from "./mappers/material-response.mapper";

@ApiTags("Materials")
@Controller("materials")
export class MaterialController {
	constructor(
		private readonly courseService: CourseService,
		private readonly materialService: MaterialService,
	) {}

	@GetCoursesSwagger()
	@Get("courses")
	@UseGuards(JwtAccessGuard)
	@HttpCode(HttpStatus.OK)
	async getCourses(): Promise<CourseDto[]> {
		const courses = await this.courseService.getCourses();
		return courses.map(mapCourseToResponse);
	}

	@CreateCourseSwagger()
	@Post("courses")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.CREATED)
	async createCourse(@Body() createCourseDto: CreateCourseDto): Promise<CourseDto> {
		const course = await this.courseService.createCourse(createCourseDto);
		return mapCourseToResponse(course);
	}

	@UpdateCourseSwagger()
	@Put("courses/:id")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async updateCourse(@Param("id") id: string, @Body() updateCourseDto: UpdateCourseDto): Promise<CourseDto> {
		const course = await this.courseService.updateCourse(+id, updateCourseDto);
		return mapCourseToResponse(course);
	}

	@DeleteCourseSwagger()
	@Delete("courses/:id")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async deleteCourse(@Param("id") id: string): Promise<boolean> {
		return await this.courseService.deleteCourse(+id);
	}

	@GetCourseMaterialsSwagger()
	@Get("courses/:id/materials")
	@UseGuards(JwtAccessGuard)
	@HttpCode(HttpStatus.OK)
	async getCourseMaterials(@Param("id") id: string, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<MaterialDto[]> {
		const materials = await this.materialService.getCourseMaterials(+id, +teacher.id, teacher.role);
		return materials.map(mapMaterialToResponse);
	}

	@GetCourseAccessSwagger()
	@Get("courses/:id/access")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async getCourseAccess(@Param("id") id: string): Promise<CourseAccessTeacherDto[]> {
		return await this.materialService.getCourseAccess(+id);
	}

	@GrantCourseAccessSwagger()
	@Post("courses/:id/access")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async grantCourseAccess(@Param("id") id: string, @Body() updateAccessDto: UpdateAccessDto): Promise<void> {
		return await this.materialService.grantCourseAccess(+id, updateAccessDto.teacherIds);
	}

	@RevokeCourseAccessSwagger()
	@Delete("courses/:id/access")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async revokeCourseAccess(@Param("id") id: string, @Body() updateAccessDto: UpdateAccessDto): Promise<void> {
		return await this.materialService.revokeCourseAccess(+id, updateAccessDto.teacherIds);
	}

	@UploadInitSwagger()
	@Post("upload/init")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async uploadInit(@Body() uploadInitDto: UploadInitDto): Promise<UploadInitResponseDto> {
		return await this.materialService.uploadInit(uploadInitDto);
	}

	@UploadCompleteSwagger()
	@Post("upload/:id/complete")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async uploadComplete(@Param("id") id: string): Promise<void> {
		return await this.materialService.uploadComplete(+id);
	}

	@OpenMaterialSwagger()
	@Post(":id/view-url")
	@UseGuards(JwtAccessGuard)
	@HttpCode(HttpStatus.OK)
	async openMaterial(@Param("id") id: string, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<ViewUrlDto> {
		return await this.materialService.getViewUrl(+id, +teacher.id, teacher.role);
	}

	@RenameMaterialSwagger()
	@Put(":id")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.OK)
	async renameMaterial(@Param("id") id: string, @Body() renameMaterialDto: RenameMaterialDto): Promise<MaterialDto> {
		const material = await this.materialService.renameMaterial(+id, renameMaterialDto.originalName);
		return mapMaterialToResponse(material);
	}

	@GrantMaterialAccessSwagger()
	@Post(":id/access")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async grantMaterialAccess(@Param("id") id: string, @Body() updateAccessDto: UpdateAccessDto): Promise<void> {
		return await this.materialService.grantMaterialAccess(+id, updateAccessDto.teacherIds);
	}

	@RevokeMaterialAccessSwagger()
	@Delete(":id/access")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async revokeMaterialAccess(@Param("id") id: string, @Body() updateAccessDto: UpdateAccessDto): Promise<void> {
		return await this.materialService.revokeMaterialAccess(+id, updateAccessDto.teacherIds);
	}

	@DeleteFileSwagger()
	@Delete("upload/:id")
	@UseGuards(JwtAccessGuard, AdminAccessGuard)
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteFile(@Param("id") id: string): Promise<void> {
		return await this.materialService.deleteMaterial(+id);
	}

	@GetMaterialsSizeSwagger()
	@Get("size")
	@UseGuards(JwtAccessGuard)
	@HttpCode(HttpStatus.OK)
	async getMaterialsSize(): Promise<MaterialsSizeDto> {
		const totalSizeBytes = await this.materialService.getMaterialsSize();
		return { totalSizeBytes };
	}
}
