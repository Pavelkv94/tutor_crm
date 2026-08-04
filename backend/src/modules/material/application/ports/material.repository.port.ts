import { MaterialEntity } from "@/modules/material/domain/material.entity";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

export type CreateMaterialParams = {
	courseId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	status: UploadStatus;
};

export type UpdateMaterialParams = {
	sizeBytes: number;
	status: UploadStatus;
};

export abstract class MaterialRepositoryPort {
	abstract createMaterial(params: CreateMaterialParams): Promise<number>;
	abstract getMaterialById(id: number): Promise<MaterialEntity | null>;
	abstract getMaterialsByCourseId(courseId: number): Promise<MaterialEntity[]>;
	abstract updateMaterial(id: number, params: UpdateMaterialParams): Promise<MaterialEntity>;
	abstract hasFiles(courseId: number): Promise<boolean>;
	abstract hasAccess(teacherId: number, materialId: number): Promise<boolean>;
	abstract createFileAccess(teacherIds: number[], materialId: number): Promise<void>;
	abstract revokeFileAccess(teacherIds: number[], materialId: number): Promise<void>;
	abstract grantCourseAccess(courseId: number, teacherIds: number[]): Promise<void>;
	abstract revokeCourseAccess(courseId: number, teacherIds: number[]): Promise<void>;
	abstract deleteMaterial(id: number): Promise<void>;
	abstract getMaterialsSize(): Promise<number>;
}
