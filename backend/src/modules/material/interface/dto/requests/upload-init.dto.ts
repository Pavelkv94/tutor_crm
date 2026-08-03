import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsNotEmpty, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class UploadInitDto {
	@IsInt()
	@IsNotEmpty()
	@ApiProperty({ description: 'The id of the course the file belongs to', example: 1 })
	courseId: number;

	@IsArray()
	@IsInt({ each: true })
	@ApiProperty({ description: 'Ids of teachers who will have access to the file', example: [1, 2, 3], type: [Number] })
	teachers: number[];

	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(255)
	@ApiProperty({ description: 'The original name of the file', example: 'lesson5.pdf' })
	fileName: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'The MIME type of the file', example: 'application/pdf' })
	mimeType: string;

	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'The content type of the file', example: 'application/pdf' })
	contentType: string;

	@IsInt()
	@IsPositive()
	@ApiProperty({ description: 'The size of the file in bytes', example: 12345678 })
	sizeBytes: number;
}
