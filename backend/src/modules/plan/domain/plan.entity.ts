import { ApiProperty } from "@nestjs/swagger";

export class PlanEntity {
	id: number;
	plan_name: string;
	plan_price: number;
	plan_currency: string;
	duration: number;
	plan_type: string;
	deleted_at: Date | null;
	created_at: Date;
}