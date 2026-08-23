import { ApiProperty } from "@nestjs/swagger";

/**
 * Платёжные реквизиты преподавателя. Отдаются вместе с карточкой преподавателя,
 * чтобы администратор мог их отредактировать и сформировать счёт.
 */
export class TeacherBillingDetailsDto {
	@ApiProperty({ description: 'ФИО преподавателя латиницей', example: 'Demukh Anna Aleksandrovna', nullable: true })
	full_name_latin: string | null;
	@ApiProperty({ description: 'Адрес преподавателя', example: 'Orsha, Belarus', nullable: true })
	address: string | null;
	@ApiProperty({ description: 'Паспорт преподавателя', example: 'BM 2712432', nullable: true })
	passport: string | null;
	@ApiProperty({ description: 'Email преподавателя', example: 'teacher@gmail.com', nullable: true })
	email: string | null;
	@ApiProperty({ description: 'Название банка', example: 'Belagroprombank', nullable: true })
	bank_name: string | null;
	@ApiProperty({ description: 'Номер счёта', example: 'BY81BAPB30140000064105565150', nullable: true })
	bank_account: string | null;
}
