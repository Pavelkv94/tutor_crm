import { ApiProperty } from "@nestjs/swagger";

export class StudentOutputDto {
	@ApiProperty({ description: 'The id of the student', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the student' , example: 'John Doe' })
	name: string;
	@ApiProperty({ description: 'The class of the student' , example: 1 })
	class: number;
	@ApiProperty({ description: 'The birth date of the student' , example: '2000-01-01' })
	birth_date: Date;
}

export class StudentExtendedOutputDto extends StudentOutputDto {
	@ApiProperty({ description: 'The balance of the student' , example: 0 })
	balance: number;
	@ApiProperty({ description: 'The book until cancellation of the student' , example: false })
	bookUntilCancellation: boolean;
	@ApiProperty({ description: 'The notify about birthday of the student' , example: true })
	notifyAboutBirthday: boolean;
	@ApiProperty({ description: 'The notify about lessons of the student' , example: true })
	notifyAboutLessons: boolean;
	// @ApiProperty({ description: 'The telegrams of the student' , type: [TelegramOutputDto] })
	// telegrams: TelegramOutputDto[];
}