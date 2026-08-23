import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { SettingsDto } from "@/modules/settings/interface/dto/responses/settings.dto";

export const GetSettingsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Настройки школы",
			description: "Курс евро виден только администратору.",
		}),
		ApiOkResponse({ description: "Настройки школы", type: SettingsDto }),
		ApiUnauthorizedResponse({ description: "Требуется роль администратора" }),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
