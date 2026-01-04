import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class ManageFreeLessonStatusDto {
	@ApiProperty({
		description: "Is free",
		example: true,
	})
	@IsBoolean()
	@IsNotEmpty()
	isFree: boolean;

}