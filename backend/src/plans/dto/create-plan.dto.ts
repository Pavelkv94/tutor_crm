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

export class CreatePlanDto {
	@IsEnum(PlanType)
	@IsNotEmpty()
	plan_type: PlanType;

	@IsEnum(PlanCurrency)
	@IsNotEmpty()
	plan_currency: PlanCurrency;

	@IsInt()
	@IsNotEmpty()
	@Max(1000000)
	plan_price: number;

	@IsInt()
	@IsNotEmpty()
	duration: number;

	@IsString()
	@IsNotEmpty()
	plan_name: string;
}
