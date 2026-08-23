import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from '@/modules/student/interface/dto/requests/create-student.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
	@ApiProperty({ description: 'The birth date of the student', example: new Date('2000-01-01'), required: false })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	birth_date?: Date | null;

	@ApiProperty({
		description:
			'Ответ про использование фото/видео: true — согласен, false — отказался, null — вернуть в состояние ' +
			'«вопрос не задавали», после чего он снова появится на странице оплаты. Дата ответа проставляется ' +
			'автоматически при изменении ответа.',
		type: Boolean,
		example: false,
		required: false,
		nullable: true,
	})
	// @IsOptional() пропускает null мимо @IsBoolean() — это и даёт третье значение.
	@IsBoolean()
	@IsOptional()
	marketing_consent?: boolean | null;

	// balance_currency вручную не задаётся: при нулевом балансе её запрещает CHECK-констрейнт
	// в БД, при ненулевом — менять валюту нельзя, пока остаток не израсходован.
	// Единственный источник валюты — BalanceService.reconcile.
}
