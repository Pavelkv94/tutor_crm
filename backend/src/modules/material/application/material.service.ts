import { randomUUID } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { R2Service } from "@/infrastructure/storage/r2.service";
import { CourseRepositoryPort } from "@/modules/material/application/ports/course.repository.port";
import { MaterialRepositoryPort } from "@/modules/material/application/ports/material.repository.port";
import { FileAccessType } from "@/modules/material/domain/file-access-type.enum";
import { MaterialEntity, TeacherRef } from "@/modules/material/domain/material.entity";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";
import { UploadInitDto } from "@/modules/material/interface/dto/requests/upload-init.dto";
import { UploadInitResponseDto } from "@/modules/material/interface/dto/responses/upload-init-response.dto";
import { TeacherRoleEnum } from "@/modules/teacher/interface/dto/teacherRole";
import { ViewUrlDto } from "../interface/dto/responses/view-url.dto";

@Injectable()
export class MaterialService {
	constructor(
		private readonly materialRepository: MaterialRepositoryPort,
		private readonly courseRepository: CourseRepositoryPort,
		private readonly r2Service: R2Service,
	) {}

	async getCourseMaterials(courseId: number, teacherId: number, role: string): Promise<MaterialEntity[]> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		const materials = await this.materialRepository.getMaterialsByCourseId(courseId);
		const isAdmin = role === TeacherRoleEnum.ADMIN;

		return materials.map((material) => ({
			...material,
			hasAccess: isAdmin || (material.teachers ?? []).some((teacher) => teacher.id === teacherId),
		}));
	}

	async getCourseAccess(courseId: number): Promise<TeacherRef[]> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		return await this.materialRepository.getCourseAccessTeachers(courseId);
	}

	async uploadInit(uploadInitDto: UploadInitDto): Promise<UploadInitResponseDto> {
		const storageKey = `${uploadInitDto.courseId}/${randomUUID()}-${uploadInitDto.fileName}`;

		const uploadUrl = await this.r2Service.createUploadUrl({
			key: storageKey,
			contentType: uploadInitDto.contentType,
		});

		const materialId = await this.materialRepository.createMaterial({
			courseId: uploadInitDto.courseId,
			storageKey,
			originalName: uploadInitDto.fileName,
			mimeType: uploadInitDto.mimeType,
			sizeBytes: uploadInitDto.sizeBytes,
			status: UploadStatus.UPLOADING,
		});

		// Преподавателям с доступом к курсу файл доступен и без персональной записи
		const teachersWithCourseAccess = new Set(await this.materialRepository.filterTeachersWithCourseAccess(uploadInitDto.courseId, uploadInitDto.teachers));
		const personalTeachers = uploadInitDto.teachers.filter((teacherId) => !teachersWithCourseAccess.has(teacherId));

		await this.materialRepository.setFileAccess(personalTeachers, materialId, FileAccessType.ALLOW);

		return {
			materialId,
			uploadUrl,
		};
	}

	async uploadComplete(id: number): Promise<void> {
		const material = await this.materialRepository.getMaterialById(id);

		if (!material) {
			throw new NotFoundException("Материал не найден");
		}

		if (material.status !== UploadStatus.UPLOADING) {
			throw new BadRequestException("Загрузка уже завершена");
		}

		const object = await this.r2Service.getObjectInfo(material.storageKey);

		if (!object) {
			throw new BadRequestException("Файл не найден в хранилище, загрузка не завершена");
		}

		if (object.contentLength !== material.sizeBytes) {
			throw new BadRequestException("Размер файла не совпадает с заявленным");
		}

		await this.materialRepository.updateMaterial(id, {
			sizeBytes: object.contentLength,
			status: UploadStatus.UPLOADED,
		});
	}

	async getViewUrl(id: number, teacherId: number, role: string): Promise<ViewUrlDto> {
		const material = await this.materialRepository.getMaterialById(id);

		if (!material) {
			throw new NotFoundException("Материал не найден");
		}

		if (material.status !== UploadStatus.UPLOADED) {
			throw new BadRequestException("Материал ещё не загружен");
		}

		if (role !== TeacherRoleEnum.ADMIN) {
			const hasAccess = await this.materialRepository.hasAccess(teacherId, material.id);

			if (!hasAccess) {
				throw new ForbiddenException("Нет доступа к этому материалу");
			}
		}

		const url = await this.r2Service.createReadUrl(material.storageKey, 60);

		return { url };
	}

	async renameMaterial(id: number, originalName: string): Promise<MaterialEntity> {
		const material = await this.materialRepository.getMaterialById(id);
		if (!material) {
			throw new NotFoundException("Материал не найден");
		}
		const renamedMaterial = await this.materialRepository.renameMaterial(id, originalName);

		// Переименование доступно только админу, у которого доступ есть ко всем материалам
		return { ...renamedMaterial, hasAccess: true };
	}

	async deleteMaterial(id: number): Promise<void> {
		const material = await this.materialRepository.getMaterialById(id);
		if (!material) {
			throw new NotFoundException("Материал не найден");
		}
		// Сначала запись в БД: если удаление файла из хранилища упадёт, материал не превратится в битую ссылку
		await this.materialRepository.deleteMaterial(id);
		await this.r2Service.deleteObject(material.storageKey);
	}

	async getMaterialsSize(): Promise<number> {
		return await this.materialRepository.getMaterialsSize();
	}

	async grantMaterialAccess(materialId: number, teacherIds: number[]): Promise<void> {
		const material = await this.materialRepository.getMaterialById(materialId);
		if (!material) {
			throw new NotFoundException("Материал не найден");
		}
		const { withCourseAccess, withoutCourseAccess } = await this.splitByCourseAccess(material.courseId, teacherIds);

		// Тем, у кого есть доступ к курсу, достаточно снять персональное ограничение; остальным нужна точечная выдача
		await this.materialRepository.clearFileAccess(withCourseAccess, materialId);
		await this.materialRepository.setFileAccess(withoutCourseAccess, materialId, FileAccessType.ALLOW);
	}

	async revokeMaterialAccess(materialId: number, teacherIds: number[]): Promise<void> {
		const material = await this.materialRepository.getMaterialById(materialId);
		if (!material) {
			throw new NotFoundException("Материал не найден");
		}
		const { withCourseAccess, withoutCourseAccess } = await this.splitByCourseAccess(material.courseId, teacherIds);

		// Доступ по курсу отзывается персональным ограничением, точечная выдача — удалением записи
		await this.materialRepository.setFileAccess(withCourseAccess, materialId, FileAccessType.DENY);
		await this.materialRepository.clearFileAccess(withoutCourseAccess, materialId);
	}

	async grantCourseAccess(courseId: number, teacherIds: number[]): Promise<void> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		await this.materialRepository.grantCourseAccess(courseId, teacherIds);
	}

	async revokeCourseAccess(courseId: number, teacherIds: number[]): Promise<void> {
		const course = await this.courseRepository.getCourseById(courseId);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		await this.materialRepository.revokeCourseAccess(courseId, teacherIds);
	}

	private async splitByCourseAccess(courseId: number, teacherIds: number[]): Promise<{ withCourseAccess: number[]; withoutCourseAccess: number[] }> {
		const courseAccessTeacherIds = new Set(await this.materialRepository.filterTeachersWithCourseAccess(courseId, teacherIds));

		return {
			withCourseAccess: teacherIds.filter((teacherId) => courseAccessTeacherIds.has(teacherId)),
			withoutCourseAccess: teacherIds.filter((teacherId) => !courseAccessTeacherIds.has(teacherId)),
		};
	}
}
