import { Module } from "@nestjs/common";
import { SettingsService } from "@/modules/settings/application/settings.service";
import { SettingsController } from "@/modules/settings/interface/settings.controller";
import { SettingsRepository } from "@/modules/settings/infrastructure/settings.repository";
import { SettingsRepositoryPort } from "@/modules/settings/application/ports/settings.repository.port";

@Module({
	controllers: [SettingsController],
	providers: [SettingsService, { provide: SettingsRepositoryPort, useClass: SettingsRepository }],
	exports: [SettingsService],
})
export class SettingsModule {}
