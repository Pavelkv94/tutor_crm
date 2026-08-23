import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/** Потолок курса — бизнес-правило: в БД CHECK ограничивает только знак. */
const MAX_EUR_RATE = 1_000_000;

export class UpdateSettingsDto {
	@ApiProperty({
		description: "Внутренний курс евро в сотых долях BYN: 500 = 1 € = 5.00 BYN. 0 — курс не задан.",
		example: 500,
		minimum: 0,
		maximum: MAX_EUR_RATE,
	})
	@IsInt()
	@Min(0)
	@Max(MAX_EUR_RATE)
	eur_rate: number;
}
