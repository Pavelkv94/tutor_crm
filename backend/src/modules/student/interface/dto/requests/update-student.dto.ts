import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from '@/modules/student/interface/dto/requests/create-student.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentCurrency } from '@/modules/student/interface/dto/responses/payment-currency.enum';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
	@ApiProperty({ description: 'The birth date of the student', example: new Date('2000-01-01'), required: false })
	@Type(() => Date)
	@IsDate()
	@IsOptional()
	birth_date?: Date | null;

	@ApiProperty({ description: 'Whether the student has given marketing consent', example: false, required: false })
	@IsBoolean()
	@IsOptional()
	marketing_consent?: boolean;

	@ApiProperty({ description: 'The payment currency of the student', example: 'BYN', enum: PaymentCurrency, required: false })
	@IsEnum(PaymentCurrency)
	@IsOptional()
	payment_currency?: PaymentCurrency;
}
