import { ApiProperty } from "@nestjs/swagger";

export class SettingsDto {
	@ApiProperty({
		description: "Внутренний курс евро в сотых долях BYN: 500 = 1 € = 5.00 BYN. 0 — курс не задан.",
		example: 500,
	})
	eur_rate: number;

	@ApiProperty({ description: "null — курс ни разу не задавали", nullable: true, example: "2026-08-24T10:00:00.000Z" })
	updated_at: Date | null;
}
