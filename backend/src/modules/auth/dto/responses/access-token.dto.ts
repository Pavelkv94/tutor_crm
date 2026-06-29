import { ApiProperty } from "@nestjs/swagger";

export class LoginOutputDto {
	@ApiProperty({ description: 'The access token', example: '1234567890' })
	accessToken: string;
}