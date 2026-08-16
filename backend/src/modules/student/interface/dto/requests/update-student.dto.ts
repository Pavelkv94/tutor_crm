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
		description: 'Согласие на использование фото/видео. Дата ответа проставляется автоматически при изменении значения.',
		example: false,
		required: false,
	})
	@IsBoolean()
	@IsOptional()
	marketing_consent?: boolean;

	@ApiProperty({
		description: 'Приняты ли условия обслуживания. Снятие флага обнуляет дату — вопрос снова появится на странице оплаты.',
		example: false,
		required: false,
	})
	@IsBoolean()
	@IsOptional()
	terms_accepted?: boolean;

	// balance_currency вручную не задаётся: при нулевом балансе её запрещает CHECK-констрейнт
	// в БД, при ненулевом — менять валюту нельзя, пока остаток не израсходован.
	// Единственный источник валюты — BalanceService.reconcile.
}
