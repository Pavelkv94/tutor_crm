import { ApiProperty } from "@nestjs/swagger";

export class MaterialsSizeDto {
	@ApiProperty({ description: "Total size of all uploaded materials in bytes", example: 10485760 })
	totalSizeBytes: number;
}
