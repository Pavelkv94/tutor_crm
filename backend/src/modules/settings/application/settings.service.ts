import { Injectable } from "@nestjs/common";
import { SettingsRepositoryPort } from "@/modules/settings/application/ports/settings.repository.port";
import { SchoolSettingsEntity } from "@/modules/settings/domain/school-settings.entity";
import { UpdateSettingsDto } from "@/modules/settings/interface/dto/requests/update-settings.dto";

@Injectable()
export class SettingsService {
	constructor(private readonly settingsRepository: SettingsRepositoryPort) {}

	async getSettings(): Promise<SchoolSettingsEntity> {
		return this.settingsRepository.getSettings();
	}

	async updateSettings(dto: UpdateSettingsDto): Promise<SchoolSettingsEntity> {
		return this.settingsRepository.updateSettings({ eur_rate: dto.eur_rate });
	}

	/**
	 * Узкий метод для выставления счетов: возвращает только курс в сотых.
	 * 0 — курс не задан, ссылку на оплату BYN-счёта выставлять нельзя.
	 */
	async getEurRate(): Promise<number> {
		const settings = await this.settingsRepository.getSettings();
		return settings.eur_rate;
	}
}
