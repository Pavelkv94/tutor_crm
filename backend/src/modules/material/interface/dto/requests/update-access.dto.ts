import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt } from "class-validator";

export class UpdateAccessDto {
	@IsArray()
	@IsInt({ each: true })
	@ApiProperty({ description: "Ids of teachers to grant or revoke access for", example: [1, 2, 3], type: [Number] })
	teacherIds: number[];
}
