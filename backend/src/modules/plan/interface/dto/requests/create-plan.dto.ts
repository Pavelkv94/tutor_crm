import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt,  IsNotEmpty, IsString, Max } from "class-validator";
import { Currency } from "@/shared/enums/currency.enum";

export enum PlanTypeEnum {
	INDIVIDUAL = "INDIVIDUAL",
	PAIR = "PAIR",
}

export class CreatePlanDto {
	@ApiProperty({ enum: PlanTypeEnum })
	@IsEnum(PlanTypeEnum)
	@IsNotEmpty()
	plan_type: PlanTypeEnum;

	@ApiProperty({ enum: Currency })
	@IsEnum(Currency)
	@IsNotEmpty()
	plan_currency: Currency;

	@ApiProperty({ description: 'Цена занятия в минорных единицах валюты: 3400 — это 34,00', example: 3400 })
	@IsInt()
	@IsNotEmpty()
	@Max(100000000)
	plan_price: number;

	@ApiProperty({ example: 10 })
	@IsInt()
	@ApiProperty({ example: '10' })
	@IsNotEmpty()
	duration: number;
}
