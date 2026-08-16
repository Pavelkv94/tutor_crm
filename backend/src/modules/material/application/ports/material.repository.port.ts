import { FileAccessType } from "@/modules/material/domain/file-access-type.enum";
import { MaterialEntity, TeacherRef } from "@/modules/material/domain/material.entity";
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
	abstract renameMaterial(id: number, originalName: string): Promise<MaterialEntity>;
	abstract hasFiles(courseId: number): Promise<boolean>;
	abstract hasAccess(teacherId: number, materialId: number): Promise<boolean>;
	abstract setFileAccess(teacherIds: number[], materialId: number, type: FileAccessType): Promise<void>;
	abstract clearFileAccess(teacherIds: number[], materialId: number): Promise<void>;
	abstract grantCourseAccess(courseId: number, teacherIds: number[]): Promise<void>;
	abstract revokeCourseAccess(courseId: number, teacherIds: number[]): Promise<void>;
	abstract getCourseAccessTeachers(courseId: number): Promise<TeacherRef[]>;
	abstract filterTeachersWithCourseAccess(courseId: number, teacherIds: number[]): Promise<number[]>;
	abstract deleteMaterial(id: number): Promise<void>;
	abstract getMaterialsSize(): Promise<number>;
}
