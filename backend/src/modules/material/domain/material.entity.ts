import { AccessSource } from "@/modules/material/domain/access-source.enum";
import { FileType } from "@/modules/material/domain/file-type.enum";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

export type TeacherRef = {
	id: number;
	name: string;
};

export type MaterialTeacher = TeacherRef & {
	accessSource: AccessSource;
};

export class MaterialEntity {
	id: number;
	courseId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	type: FileType;
	status: UploadStatus;
	created_at: Date;
	/** Преподаватели, у которых есть доступ к материалу, с указанием источника доступа */
	teachers?: MaterialTeacher[];
	/** Преподаватели с доступом к курсу, которым доступ к этому материалу ограничен персонально */
	restrictedTeachers?: TeacherRef[];
	/** Есть ли доступ у пользователя, запросившего материал */
	hasAccess?: boolean;
}
