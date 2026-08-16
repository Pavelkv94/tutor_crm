import { ApiProperty } from "@nestjs/swagger";
import { AccessSource } from "@/modules/material/domain/access-source.enum";
import { FileType } from "@/modules/material/domain/file-type.enum";
import { UploadStatus } from "@/modules/material/domain/upload-status.enum";

export class TeacherRefDto {
	@ApiProperty({ description: "The id of the teacher", example: 1 })
	id: number;

	@ApiProperty({ description: "The name of the teacher", example: "John Doe" })
	name: string;
}

export class MaterialTeacherDto extends TeacherRefDto {
	@ApiProperty({
		description: "Where the access comes from: the whole course or this material only",
		enum: AccessSource,
		example: AccessSource.COURSE,
	})
	accessSource: AccessSource;
}

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
	@ApiProperty({ description: "Teachers who have access to this material", type: [MaterialTeacherDto] })
	teachers: MaterialTeacherDto[];
	@ApiProperty({
		description: "Teachers with course access whose access to this material has been restricted",
		type: [TeacherRefDto],
	})
	restrictedTeachers: TeacherRefDto[];
	@ApiProperty({ description: "Whether the requesting user has access to this material", example: true })
	hasAccess: boolean;
}
