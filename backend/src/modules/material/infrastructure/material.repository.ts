import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { File, FileType as PrismaFileType } from "@/infrastructure/prisma/generated/client";
import { CreateMaterialParams, MaterialRepositoryPort, UpdateMaterialParams } from "@/modules/material/application/ports/material.repository.port";
import { FileType } from "@/modules/material/domain/file-type.enum";
import { MaterialEntity } from "@/modules/material/domain/material.entity";
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
		const files = await this.prisma.file.findMany({
			where: { course_id: courseId, upload_status: UploadStatus.UPLOADED },
			include: {
				file_accesses: {
					include: {
						teacher: true,
					},
				},
			},
			orderBy: { created_at: "desc" },
		});
		return files.map((file) => ({
			...this.mapFileToEntity(file),
			teachers: file.file_accesses.map((access) => ({
				id: access.teacher.id,
				name: access.teacher.name,
			})),
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

	async hasFiles(courseId: number): Promise<boolean> {
		const filesCount = await this.prisma.file.count({
			where: { course_id: courseId },
		});
		return filesCount > 0;
	}

	async hasAccess(teacherId: number, materialId: number): Promise<boolean> {
		const fileAccess = await this.prisma.fileAccess.findFirst({
			where: { teacher_id: teacherId, file_id: materialId },
		});
		return fileAccess !== null;
	}

	async createFileAccess(teacherIds: number[], materialId: number): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		await this.prisma.fileAccess.createMany({
			data: teacherIds.map((teacherId) => ({ teacher_id: teacherId, file_id: materialId })),
			skipDuplicates: true,
		});
	}

	async revokeFileAccess(teacherIds: number[], materialId: number): Promise<void> {
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
		const files = await this.prisma.file.findMany({
			where: { course_id: courseId },
			select: { id: true },
		});
		if (files.length === 0) {
			return;
		}
		await this.prisma.fileAccess.createMany({
			data: files.flatMap((file) => teacherIds.map((teacherId) => ({ teacher_id: teacherId, file_id: file.id }))),
			skipDuplicates: true,
		});
	}

	async revokeCourseAccess(courseId: number, teacherIds: number[]): Promise<void> {
		if (teacherIds.length === 0) {
			return;
		}
		await this.prisma.fileAccess.deleteMany({
			where: { teacher_id: { in: teacherIds }, file: { course_id: courseId } },
		});
	}

	async deleteMaterial(id: number): Promise<void> {
		await this.prisma.file.delete({
			where: { id },
		});
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
