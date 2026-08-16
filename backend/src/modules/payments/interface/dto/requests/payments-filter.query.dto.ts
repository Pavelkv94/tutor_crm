import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional } from "class-validator";
import { PaymentStatusEnum } from "@/modules/balance/domain/payment-status.enum";
import { PaymentTypeEnum } from "@/modules/balance/domain/payment-type.enum";

export class PaymentsFilterQueryDto {
	@ApiProperty({ required: false, example: 1 })
	@Type(() => Number)
	@IsInt()
	@IsOptional()
	student_id?: number;

	@ApiProperty({ required: false, enum: PaymentStatusEnum })
	@IsEnum(PaymentStatusEnum)
	@IsOptional()
	status?: PaymentStatusEnum;

	@ApiProperty({ required: false, enum: PaymentTypeEnum })
	@IsEnum(PaymentTypeEnum)
	@IsOptional()
	type?: PaymentTypeEnum;

	@ApiProperty({ required: false, example: "2026-08-01" })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	from?: Date;

	@ApiProperty({ required: false, example: "2026-08-31" })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	to?: Date;
}
