import { ApiProperty } from "@nestjs/swagger";
import { Currency } from "@/shared/enums/currency.enum";

export class PlanEntity {
	id: number;
	plan_name: string;
	plan_price: number;
	plan_currency: Currency;
	duration: number;
	plan_type: string;
	deleted_at: Date | null;
	created_at: Date;
	stripe_product_id: string | null;
	stripe_price_id: string | null;
}