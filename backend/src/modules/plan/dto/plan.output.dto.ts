import { ApiProperty } from "@nestjs/swagger";

export class PlanOutputDto {
	@ApiProperty({ description: 'The id of the plan', example: 1 })
	id: number;
	@ApiProperty({ description: 'The name of the plan', example: '10 minutes' })
	plan_name: string;
	@ApiProperty({ description: 'The price of the plan', example: 1000000 })
	plan_price: number;
	@ApiProperty({ description: 'The currency of the plan', example: 'USD' })
	plan_currency: string;
	@ApiProperty({ description: 'The duration of the plan', example: 10 })
	duration: number;
	@ApiProperty({ description: 'The type of the plan', example: 'INDIVIDUAL' })
	plan_type: string;
	@ApiProperty({ description: 'The deleted at of the plan', example: '2026-01-01T00:00:00.000Z' })
	deleted_at: Date | null;
	@ApiProperty({ description: 'The created at of the plan', example: '2026-01-01T00:00:00.000Z' })
	created_at: Date;
}