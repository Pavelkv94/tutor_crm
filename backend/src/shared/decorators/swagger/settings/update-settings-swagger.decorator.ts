import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { SettingsDto } from "@/modules/settings/interface/dto/responses/settings.dto";

export const UpdateSettingsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Изменить настройки школы",
			description:
				"Курс евро задаётся в сотых долях BYN (500 = 1 € = 5.00 BYN). По нему пересчитываются " +
				"счета учеников с BYN-планами, которые платят через Stripe. 0 — курс не задан, ссылки " +
				"на оплату таким ученикам не выставляются.",
		}),
		ApiOkResponse({ description: "Настройки обновлены", type: SettingsDto }),
		ApiBadRequestResponse({ description: "Некорректный курс" }),
		ApiUnauthorizedResponse({ description: "Требуется роль администратора" }),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
