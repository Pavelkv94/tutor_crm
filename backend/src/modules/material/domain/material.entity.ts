import { FileType } from "@/modules/material/domain/file-type.enum";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

export type MaterialTeacher = {
	id: number;
	name: string;
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
	teachers?: MaterialTeacher[];
}
