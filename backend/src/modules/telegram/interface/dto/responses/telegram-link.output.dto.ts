import { ApiProperty } from "@nestjs/swagger";

export class TelegramLinkOutputDto {
	@ApiProperty({ description: 'The link to the telegram bot', example: 'https://t.me/teacher_bot?start=1234567890' })
	link: string;
}