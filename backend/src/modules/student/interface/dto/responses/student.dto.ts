import { ApiProperty } from "@nestjs/swagger";
import { Timezone } from "@/modules/teacher/interface/dto/responses/teacher.dto";
import { PlanDto } from '@/modules/plan/interface/dto/responses/plan.dto';
import { PaymentCurrency } from '@/modules/student/interface/dto/responses/payment-currency.enum';

export class StudentDto {
	@ApiProperty({ description: 'The id of the student', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the student' , example: 'John Doe' })
	name: string;
	@ApiProperty({ description: 'The class of the student' , example: 1 })
	class: number;
	@ApiProperty({ description: 'The birth date of the student' , example: '2000-01-01' })
	birth_date: Date | null;
	@ApiProperty({ description: 'The age of the student in full years', example: 20, nullable: true })
	age: number | null;
	@ApiProperty({ description: 'The created at of the student', example: '2026-01-01T00:00:00.000Z' })
	created_at: Date;
	@ApiProperty({ description: 'The deleted at of the student', example: '2026-01-01T00:00:00.000Z' })
	deleted_at: Date | null;
	@ApiProperty({ description: 'The teacher id of the student', example: 1 })
	teacher_id: number | null;
	@ApiProperty({ description: 'The timezone of the student', example: 'BY' })
	timezone: Timezone | null;
	@ApiProperty({ description: 'Whether the student has given marketing consent', example: false })
	marketing_consent: boolean;
	@ApiProperty({ description: 'The payment currency of the student', example: 'BYN', enum: PaymentCurrency })
	payment_currency: PaymentCurrency;
}

export class StudentExtendedDto extends StudentDto {
	@ApiProperty({ description: 'The actual plans of the student', type: [PlanDto] })
	actualPlans: PlanDto[];
	@ApiProperty({ description: 'The balance of the student' , example: 0 })
	balance: number;
	@ApiProperty({ description: 'The book until cancellation of the student' , example: false })
	bookUntilCancellation: boolean;
	@ApiProperty({ description: 'The notify about birthday of the student' , example: true })
	notifyAboutBirthday: boolean;
	@ApiProperty({ description: 'The notify about lessons of the student' , example: true })
	notifyAboutLessons: boolean;
	// @ApiProperty({ description: 'The telegrams of the student' , type: [TelegramOutputDto] })
	// telegrams: TelegramOutputDto[];
}