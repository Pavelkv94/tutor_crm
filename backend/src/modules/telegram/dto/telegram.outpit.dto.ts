import { ApiProperty } from "@nestjs/swagger";
import { TelegramUserEnum } from "./telegram-user.enum";

export class TelegramOutputDto {
	@ApiProperty({ description: 'The id of the telegram', example: 1 })
	id: number;
	@ApiProperty({ description: 'The telegram id', example: '1234567890' })
	telegram_id: string;
	@ApiProperty({ description: 'The username', example: 'john.doe' })
	username: string | null;
	@ApiProperty({ description: 'The first name', example: 'John' })
	first_name: string | null;
	@ApiProperty({ description: 'The type of the telegram', example: 'STUDENT' })
	type: TelegramUserEnum;
}