import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt,  IsNotEmpty, IsString, Max } from "class-validator";

export enum PlanType {
	INDIVIDUAL = "INDIVIDUAL",
	PAIR = "PAIR",
}

enum PlanCurrency {
	USD = "USD",
	EUR = "EUR",
	PLN = "PLN",
	BYN = "BYN",
}

export class CreatePlanInputDto {
	@ApiProperty({ enum: PlanType })
	@IsEnum(PlanType)
	@IsNotEmpty()
	plan_type: PlanType;

	@ApiProperty({ enum: PlanCurrency })
	@IsEnum(PlanCurrency)
	@IsNotEmpty()
	plan_currency: PlanCurrency;

	@ApiProperty({ example: 1000000 })
	@IsInt()
	@IsNotEmpty()
	@Max(1000000)
	plan_price: number;

	@ApiProperty({ example: 10 })
	@IsInt()
	@ApiProperty({ example: '10' })
	@IsNotEmpty()
	duration: number;
}
