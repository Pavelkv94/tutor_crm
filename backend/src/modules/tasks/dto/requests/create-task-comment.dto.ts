import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskCommentDto {
	@ApiProperty({ description: 'Текст комментария', example: 'Готово, проверьте пожалуйста' })
	@IsString()
	@IsNotEmpty()
	comment: string;
}
