import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class RenameMaterialDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(255)
	@ApiProperty({ description: "The new name of the file", example: "lesson5.pdf" })
	originalName: string;
}
