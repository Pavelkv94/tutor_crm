import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, NotEquals } from "class-validator";
import { Currency } from "@/shared/enums/currency.enum";

export class AdjustBalanceDto {
	@ApiProperty({ description: "Знаковая дельта баланса в минорных единицах валюты (10000 — это 100,00). Отрицательная — списание.", example: 10000 })
	@IsInt()
	@NotEquals(0)
	amount: number;

	@ApiProperty({
		description: "Валюта операции. Обязательна при нулевом балансе; при ненулевом должна совпадать с валютой баланса.",
		enum: Currency,
		required: false,
	})
	@IsEnum(Currency)
	@IsOptional()
	currency?: Currency;

	@ApiProperty({ description: "Причина корректировки. Попадает в историю операций.", example: "Оплата наличными за август" })
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(500)
	comment: string;
}
