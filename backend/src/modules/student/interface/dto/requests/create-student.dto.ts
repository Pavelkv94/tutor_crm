import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsDate, IsOptional, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { MAX_STUDENT_DISCOUNT_PERCENT } from "@/shared/utils/discount.util";


export class CreateStudentDto {

	@ApiProperty({ description: 'The name of the student', example: 'John Doe' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		description: 'The class of the student: -1 adult, 0 preschooler, 1-11 school grade',
		example: 1,
		minimum: -1,
		maximum: 11,
	})
	@IsInt()
	@IsNotEmpty()
	@Min(-1)
	@Max(11)
	class: number;

	@ApiProperty({ description: 'The birth date of the student', example: new Date('2000-01-01') })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	birth_date: Date | null;

	@ApiProperty({ description: 'The teacher id of the student', example: 1 })
	@IsInt()
	@IsNotEmpty()
	teacher_id: number;

	@ApiProperty({ description: 'The timezone of the student', example: 'BY' })
	@IsEnum(Timezone)
	@IsOptional()
	timezone: Timezone;

	@ApiProperty({
		description:
			'Ответ про использование фото/видео: true — согласен, false — отказался, null или отсутствие поля — ' +
			'вопрос ещё не задавали, он появится на странице оплаты.',
		type: Boolean,
		example: false,
		required: false,
		nullable: true,
	})
	// @IsOptional() пропускает null мимо @IsBoolean() — это и даёт третье значение.
	@IsBoolean()
	@IsOptional()
	marketing_consent?: boolean | null;

	@ApiProperty({
		description: `Персональная скидка в процентах, от 0 до ${MAX_STUDENT_DISCOUNT_PERCENT}. Применяется к цене каждого занятия.`,
		example: 0,
		minimum: 0,
		maximum: MAX_STUDENT_DISCOUNT_PERCENT,
		required: false,
	})
	@IsInt()
	@Min(0)
	@Max(MAX_STUDENT_DISCOUNT_PERCENT)
	@IsOptional()
	discount?: number;

	// balance_currency сюда не входит намеренно: в БД стоит констрейнт
	// student_balance_currency_check («balance = 0 ⟺ balance_currency IS NULL»), а у нового
	// ученика баланс всегда 0. Валюту устанавливает первый платёж через BalanceService.
}
