import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "@/shared/guards/jwt-access.guard";
import { AdminAccessGuard } from "@/shared/guards/admin-access.guard";
import { SettingsService } from "@/modules/settings/application/settings.service";
import { UpdateSettingsDto } from "@/modules/settings/interface/dto/requests/update-settings.dto";
import { SettingsDto } from "@/modules/settings/interface/dto/responses/settings.dto";
import { GetSettingsSwagger } from "@/shared/decorators/swagger/settings/get-settings-swagger.decorator";
import { UpdateSettingsSwagger } from "@/shared/decorators/swagger/settings/update-settings-swagger.decorator";

/** Курс евро — внутренняя настройка школы: видит и меняет только администратор. */
@ApiTags("Settings")
@Controller("settings")
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class SettingsController {
	constructor(private readonly settingsService: SettingsService) {}

	@GetSettingsSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	async getSettings(): Promise<SettingsDto> {
		return this.settingsService.getSettings();
	}

	@UpdateSettingsSwagger()
	@Patch()
	@HttpCode(HttpStatus.OK)
	async updateSettings(@Body() dto: UpdateSettingsDto): Promise<SettingsDto> {
		return this.settingsService.updateSettings(dto);
	}
}
