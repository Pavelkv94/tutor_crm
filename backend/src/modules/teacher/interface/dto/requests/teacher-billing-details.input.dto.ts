import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Платёжные реквизиты преподавателя — попадают в шапку и в блок «Реквизиты для оплаты»
 * счёта, который преподаватель выставляет школе.
 *
 * Все поля опциональные: администратор заполняет карточку постепенно, а недостающие
 * реквизиты проверяются в момент формирования счёта. null означает «стереть значение» —
 * @IsOptional() пропускает и null, и undefined, поэтому валидаторы строк не мешают.
 */
export class TeacherBillingDetailsInputDto {
	@IsString()
	@IsOptional()
	@MaxLength(200)
	@ApiPropertyOptional({
		description: "ФИО преподавателя латиницей (для шапки счёта)",
		example: "Demukh Anna Aleksandrovna",
	})
	full_name_latin?: string | null;

	@IsString()
	@IsOptional()
	@MaxLength(300)
	@ApiPropertyOptional({
		description: "Адрес преподавателя",
		example: "Vitebskaya obl., Orsha district, Orsha, Zadneprovskaya str., 8/121, Belarus",
	})
	address?: string | null;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	@ApiPropertyOptional({
		description: "Паспорт преподавателя",
		example: "BM 2712432",
	})
	passport?: string | null;

	@IsString()
	@IsOptional()
	@MaxLength(200)
	@ApiPropertyOptional({
		description: "Email преподавателя",
		example: "annametlenokmm@gmail.com",
	})
	email?: string | null;

	@IsString()
	@IsOptional()
	@MaxLength(200)
	@ApiPropertyOptional({
		description: "Название банка",
		example: "Belagroprombank",
	})
	bank_name?: string | null;

	@IsString()
	@IsOptional()
	@MaxLength(100)
	@ApiPropertyOptional({
		description: "Номер счёта",
		example: "BY81BAPB30140000064105565150",
	})
	bank_account?: string | null;
}
