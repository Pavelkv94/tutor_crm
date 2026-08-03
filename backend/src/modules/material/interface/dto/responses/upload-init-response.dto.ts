import { ApiProperty } from "@nestjs/swagger";

export class UploadInitResponseDto {
	@ApiProperty({ description: 'The id of the created material', example: 1 })
	materialId: number;
	@ApiProperty({ description: 'The presigned URL to upload the file to', example: 'https://bucket.r2.cloudflarestorage.com/...' })
	uploadUrl: string;
}
