import { SchoolSettingsEntity } from "@/modules/settings/domain/school-settings.entity";

export abstract class SettingsRepositoryPort {
	/**
	 * Настройки школы. Если строки нет (свежая БД, e2e через `prisma db push` — там INSERT
	 * из миграции не выполняется), возвращает значения по умолчанию и ничего не пишет:
	 * чтение не должно менять состояние.
	 */
	abstract getSettings(): Promise<SchoolSettingsEntity>;

	abstract updateSettings(data: { eur_rate: number }): Promise<SchoolSettingsEntity>;
}
