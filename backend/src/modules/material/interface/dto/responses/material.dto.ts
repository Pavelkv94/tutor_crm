import { ApiProperty } from "@nestjs/swagger";
import { FileType } from "@/modules/material/domain/file-type.enum";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

export class MaterialDto {
	@ApiProperty({ description: "The id of the material", example: 1 })
	id: number;
	@ApiProperty({ description: "The id of the course this material belongs to", example: 1 })
	courseId: number;
	@ApiProperty({ description: "The original name of the file", example: "lesson5.pdf" })
	originalName: string;
	@ApiProperty({ description: "The MIME type of the file", example: "application/pdf" })
	mimeType: string;
	@ApiProperty({ description: "The size of the file in bytes", example: 12345678 })
	sizeBytes: number;
	@ApiProperty({ description: "The type of the file", enum: FileType, example: FileType.PDF })
	type: FileType;
	@ApiProperty({ description: "The upload status of the file", enum: UploadStatus, example: UploadStatus.UPLOADED })
	status: UploadStatus;
	@ApiProperty({ description: "The creation date of the material", example: "2026-01-01T00:00:00.000Z" })
	created_at: Date;
}
