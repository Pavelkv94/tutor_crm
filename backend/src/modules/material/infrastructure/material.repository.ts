import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { File, FileAccessType as PrismaFileAccessType, FileType as PrismaFileType } from "@/infrastructure/prisma/generated/client";
import { CreateMaterialParams, MaterialRepositoryPort, UpdateMaterialParams } from "@/modules/material/application/ports/material.repository.port";
import { AccessSource } from "@/modules/material/domain/access-source.enum";
import { FileAccessType } from "@/modules/material/domain/file-access-type.enum";
import { FileType } from "@/modules/material/domain/file-type.enum";
import { MaterialEntity, MaterialTeacher, TeacherRef } from "@/modules/material/domain/material.entity";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

@Injectable()
export class MaterialRepository implements MaterialRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async createMaterial(params: CreateMaterialParams): Promise<number> {
		const file = await this.prisma.file.create({
			data: {
				course_id: params.courseId,
				storage_key: params.storageKey,
				original_name: params.originalName,
				mime_type: params.mimeType,
				size_bytes: params.sizeBytes,
				type: this.resolveFileType(params.mimeType),
				upload_status: params.status,
			},
		});
		return file.id;
	}

	async getMaterialById(id: number): Promise<MaterialEntity | null> {
		const file = await this.prisma.file.findUnique({
			where: { id },
		});
		if (!file) {
			return null;
		}
		return this.mapFileToEntity(file);
	}

	async getMaterialsByCourseId(courseId: number): Promise<MaterialEntity[]> {
		const [files, courseAccesses] = await Promise.all([
			this.prisma.file.findMany({
				where: { course_id: courseId, upload_status: UploadStatus.UPLOADED },
				include: {
					file_accesses: {
						include: {
							teacher: true,
						},
					},
				},
				orderBy: { original_name: "asc" },
			}),
			this.prisma.courseAccess.findMany({
				where: { course_id: courseId },
				include: { teacher: true },
			}),
		]);

		return files.map((file) => ({
			...this.mapFileToEntity(file),
			...this.buildAccessLists(file.file_accesses, courseAccesses),
		}));
	}

	async updateMaterial(id: number, params: UpdateMaterialParams): Promise<MaterialEntity> {
		const file = await this.prisma.file.update({
			where: { id },
			data: {
				size_bytes: params.sizeBytes,
				upload_status: params.status,
			},
		});
		return this.mapFileToEntity(file);
	}

	async renameMaterial(id: number, originalName: string): Promise<MaterialEntity> {
		const file = await this.prisma.file.update({
			where: { id },
			data: { original_name: originalName },
			include: {
				file_accesses: {
					include: {
						teacher: true,
					},
				},
			},
		});
		const courseAccesses = await this.prisma.courseAccess.findMany({
			where: { course_id: file.course_id },
			include: { teacher: true },
		});
		return {
			...this.mapFileToEntity(file),
			...this.buildAccessLists(file.file_accesses, courseAccesses),
		};
	}

	async hasFiles(courseId: number): Promise<boolean> {
		const filesCount = await this.prisma.file.count({
			where: { course_id: courseId },
		});
		return filesCount > 0;
	}

	async hasAccess(teacherId: number, materialId: number): Promise<boolean> {
		const file = await this.prisma.file.findUnique({
			where: { id: materialId },
			select: {
				file_accesses: {
					where: { teacher_id: teacherId },
					select: { type: true },
				},
				course: {
					select: {
						accesses: {
							where: { teacher_id: teacherId },
							select: { id: true },
						},
					},
				},
			},
		});
		if (!file) {
			return false;
		}
		// Персональная запись всегда сильнее доступа к курсу: DENY — исключение, ALLOW — точечная выдача
		const fileAccess = file.file_accesses[0];
		if (fileAccess) {
			return fileAccess.type === PrismaFileAccessType.ALLOW;
		}
		return file.course.accesses.length > 0;
	}

	async setFileAccess(teacherIds: number[], materialId: number, type: FileAccessType): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		// Пара (teacher_id, file_id) уникальна, поэтому перезаписываем: удаляем прежнюю запись и создаём нужного типа
		await this.prisma.$transaction([
			this.prisma.fileAccess.deleteMany({ where: { teacher_id: { in: teacherIds }, file_id: materialId } }),
			this.prisma.fileAccess.createMany({
				data: teacherIds.map((teacherId) => ({ teacher_id: teacherId, file_id: materialId, type })),
			}),
		]);
	}

	async clearFileAccess(teacherIds: number[], materialId: number): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		await this.prisma.fileAccess.deleteMany({
			where: { teacher_id: { in: teacherIds }, file_id: materialId },
		});
	}

	async grantCourseAccess(courseId: number, teacherIds: number[]): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		// Доступ к курсу перекрывает персональные записи по его файлам, поэтому и ограничения, и точечные выдачи сбрасываются
		await this.prisma.$transaction([
			this.prisma.courseAccess.createMany({
				data: teacherIds.map((teacherId) => ({ teacher_id: teacherId, course_id: courseId })),
				skipDuplicates: true,
			}),
			this.prisma.fileAccess.deleteMany({
				where: { teacher_id: { in: teacherIds }, file: { course_id: courseId } },
			}),
		]);
	}

	async revokeCourseAccess(courseId: number, teacherIds: number[]): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		await this.prisma.$transaction([
			this.prisma.courseAccess.deleteMany({
				where: { teacher_id: { in: teacherIds }, course_id: courseId },
			}),
			this.prisma.fileAccess.deleteMany({
				where: { teacher_id: { in: teacherIds }, file: { course_id: courseId } },
			}),
		]);
	}

	async getCourseAccessTeachers(courseId: number): Promise<TeacherRef[]> {
		const courseAccesses = await this.prisma.courseAccess.findMany({
			where: { course_id: courseId },
			include: { teacher: true },
			orderBy: { teacher: { name: "asc" } },
		});
		return courseAccesses.map((access) => ({ id: access.teacher.id, name: access.teacher.name }));
	}

	async filterTeachersWithCourseAccess(courseId: number, teacherIds: number[]): Promise<number[]> {
		if (teacherIds.length === 0) {
			return [];
		}
		const courseAccesses = await this.prisma.courseAccess.findMany({
			where: { course_id: courseId, teacher_id: { in: teacherIds } },
			select: { teacher_id: true },
		});
		return courseAccesses.map((access) => access.teacher_id);
	}

	async deleteMaterial(id: number): Promise<void> {
		// Доступы удаляем в той же транзакции: внешний ключ file_access -> file запрещает удаление файла с выданными доступами
		await this.prisma.$transaction([
			this.prisma.fileAccess.deleteMany({ where: { file_id: id } }),
			this.prisma.file.delete({ where: { id } }),
		]);
	}

	async getMaterialsSize(): Promise<number> {
		const materialsSize = await this.prisma.file.aggregate({
			_sum: {
				size_bytes: true,
			},
			where: { upload_status: UploadStatus.UPLOADED },
		});
		return materialsSize._sum.size_bytes ?? 0;
	}

	private buildAccessLists(
		fileAccesses: { teacher_id: number; type: PrismaFileAccessType; teacher: { id: number; name: string } }[],
		courseAccesses: { teacher_id: number; teacher: { id: number; name: string } }[],
	): { teachers: MaterialTeacher[]; restrictedTeachers: TeacherRef[] } {
		const courseTeacherIds = new Set(courseAccesses.map((access) => access.teacher_id));
		const deniedTeacherIds = new Set(
			fileAccesses.filter((access) => access.type === PrismaFileAccessType.DENY).map((access) => access.teacher_id),
		);

		const teachers: MaterialTeacher[] = [
			...courseAccesses
				.filter((access) => !deniedTeacherIds.has(access.teacher_id))
				.map((access) => ({ id: access.teacher.id, name: access.teacher.name, accessSource: AccessSource.COURSE })),
			...fileAccesses
				.filter((access) => access.type === PrismaFileAccessType.ALLOW && !courseTeacherIds.has(access.teacher_id))
				.map((access) => ({ id: access.teacher.id, name: access.teacher.name, accessSource: AccessSource.FILE })),
		].sort((first, second) => first.name.localeCompare(second.name));

		const restrictedTeachers: TeacherRef[] = courseAccesses
			.filter((access) => deniedTeacherIds.has(access.teacher_id))
			.map((access) => ({ id: access.teacher.id, name: access.teacher.name }))
			.sort((first, second) => first.name.localeCompare(second.name));

		return { teachers, restrictedTeachers };
	}

	private resolveFileType(mimeType: string): PrismaFileType {
		switch (mimeType) {
			case "application/pdf":
				return PrismaFileType.PDF;
			case "text/html":
				return PrismaFileType.HTML;
			default:
				throw new BadRequestException(`Неподдерживаемый тип файла: ${mimeType}`);
		}
	}

	private mapFileToEntity(file: File): MaterialEntity {
		return {
			id: file.id,
			courseId: file.course_id,
			storageKey: file.storage_key,
			originalName: file.original_name,
			mimeType: file.mime_type,
			sizeBytes: file.size_bytes,
			type: file.type as unknown as FileType,
			status: file.upload_status as unknown as UploadStatus,
			created_at: file.created_at,
		};
	}
}
