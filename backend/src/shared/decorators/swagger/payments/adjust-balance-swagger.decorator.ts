import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { AdjustBalanceResultDto } from "@/modules/payments/interface/dto/responses/invoice.dto";

export const AdjustBalanceSwagger = () =>
	applyDecorators(
		ApiOperation({
			summary: "Ручная корректировка баланса",
			description: "Знаковая дельта. Пополнение сразу закрывает неоплаченные занятия, списание откатывает оплату с самых поздних. " + "Уйти в минус нельзя.",
		}),
		ApiOkResponse({ description: "Новый баланс и затронутые занятия", type: AdjustBalanceResultDto }),
		ApiBadRequestResponse({ description: "Недостаточно средств или конфликт валют", type: BadRequestErrorResponse }),
		ApiNotFoundResponse({ description: "Студент не найден" }),
		ApiBearerAuth(),
	);
