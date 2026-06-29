import { ApiProperty } from "@nestjs/swagger";

export class RegisterAdminOutputDto {
	@ApiProperty({ description: 'The message', example: 'Admin registered successfully' })
	message: string;
}