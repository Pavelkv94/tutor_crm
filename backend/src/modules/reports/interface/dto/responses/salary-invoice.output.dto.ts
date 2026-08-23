import { ApiProperty } from "@nestjs/swagger";

export class SalaryInvoiceOutputDto {
	@ApiProperty({ description: "Имя файла счёта", example: "2026-07-01_Rachunek_Demukh_Nr-7-2026.pdf" })
	file_name: string;
	@ApiProperty({ description: "Итоговая сумма счёта", example: 1152 })
	total: number;
	@ApiProperty({ description: "Валюта счёта", example: "BYN" })
	currency: string;
	@ApiProperty({ description: "Счёт отправлен администратору в Telegram", example: true })
	sent_to_admin: boolean;
	@ApiProperty({ description: "Счёт отправлен преподавателю в Telegram", example: false })
	sent_to_teacher: boolean;
}
