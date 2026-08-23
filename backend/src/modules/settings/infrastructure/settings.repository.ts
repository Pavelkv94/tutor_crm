import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { SchoolSettings } from "@/infrastructure/prisma/generated/client";
import { SettingsRepositoryPort } from "@/modules/settings/application/ports/settings.repository.port";
import { SchoolSettingsEntity } from "@/modules/settings/domain/school-settings.entity";

/** Строка настроек ровно одна, её id закреплён CHECK-констрейнтом school_settings_singleton_check. */
const SCHOOL_SETTINGS_ID = 1;

@Injectable()
export class SettingsRepository implements SettingsRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async getSettings(): Promise<SchoolSettingsEntity> {
		const settings = await this.prisma.schoolSettings.findUnique({ where: { id: SCHOOL_SETTINGS_ID } });
		// Отсутствие строки — штатная ситуация, а не ошибка: миграция её сеет, но e2e поднимает
		// схему через `prisma db push`, который migration.sql не выполняет.
		return settings ? this.mapSettingsToEntity(settings) : { eur_rate: 0, updated_at: null };
	}

	async updateSettings(data: { eur_rate: number }): Promise<SchoolSettingsEntity> {
		const settings = await this.prisma.schoolSettings.upsert({
			where: { id: SCHOOL_SETTINGS_ID },
			create: { id: SCHOOL_SETTINGS_ID, eur_rate: data.eur_rate },
			update: { eur_rate: data.eur_rate },
		});
		return this.mapSettingsToEntity(settings);
	}

	private mapSettingsToEntity(settings: SchoolSettings): SchoolSettingsEntity {
		return { eur_rate: settings.eur_rate, updated_at: settings.updated_at };
	}
}
