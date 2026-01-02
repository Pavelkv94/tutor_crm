import { ApiProperty } from "@nestjs/swagger";

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
	@ApiProperty({ description: 'The telegram id of the teacher', example: '1234567890' })
	telegram_id: string | null;
	@ApiProperty({ description: 'The role of the teacher', example: 'TEACHER' })
	role: string;
	@ApiProperty({ description: 'The timezone of the teacher', example: 'BY' })
	timezone: Timezone;
	@ApiProperty({ description: 'The telegram link of the teacher', example: 'https://t.me/john.doe' })
	telegram_link: string | null;
	@ApiProperty({ description: 'The deleted at of the teacher', example: '2026-01-01T00:00:00.000Z' })
	deleted_at: Date | null;
}