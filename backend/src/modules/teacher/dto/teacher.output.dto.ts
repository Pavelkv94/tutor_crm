import { ApiProperty } from "@nestjs/swagger";
import { TelegramOutputDto } from "src/modules/telegram/dto/telegram.outpit.dto";

export enum Timezone {
	BY = "BY",
	PL = "PL",
}

export class TeacherOutputDto {
	@ApiProperty({ description: 'The id of the teacher', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the teacher', example: 'John Doe' })
	name: string;
	@ApiProperty({ description: 'The login of the teacher', example: 'john.doe' })
	login: string;
	@ApiProperty({ description: 'The role of the teacher', example: 'TEACHER' })
	role: string;
	@ApiProperty({ description: 'The timezone of the teacher', example: 'BY' })
	timezone: Timezone;
	@ApiProperty({ description: 'The deleted at of the teacher', example: '2026-01-01T00:00:00.000Z' })
	deleted_at: Date | null;
	@ApiProperty({ description: 'The created at of the teacher', example: '2026-01-01T00:00:00.000Z' })
	created_at: Date;
	@ApiProperty({ description: 'The telegrams of the teacher', example: [{ id: 1, telegram_id: '1234567890', username: 'john.doe', first_name: 'John', type: 'STUDENT' }] })
	telegrams: TelegramOutputDto[];
}