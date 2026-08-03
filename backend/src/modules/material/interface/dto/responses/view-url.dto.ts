import { ApiProperty } from "@nestjs/swagger";

export class ViewUrlDto {
	@ApiProperty({ description: "The presigned URL to view the material", example: "https://bucket.r2.cloudflarestorage.com/..." })
	url: string;
}
