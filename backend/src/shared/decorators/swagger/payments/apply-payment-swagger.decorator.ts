import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { AdjustBalanceResultDto } from "@/modules/payments/interface/dto/responses/invoice.dto";

export const ApplyPaymentSwagger = () =>
	applyDecorators(
		ApiOperation({
			summary: "Применить отложенный платёж",
			description: "Для платежей в статусе REQUIRES_ATTENTION: применяются после того, как администратор разрулил конфликт валют.",
		}),
		ApiOkResponse({ description: "Платёж применён", type: AdjustBalanceResultDto }),
		ApiBadRequestResponse({ description: "Платёж не в статусе REQUIRES_ATTENTION или конфликт не разрешён", type: BadRequestErrorResponse }),
		ApiNotFoundResponse({ description: "Платёж не найден" }),
		ApiBearerAuth(),
	);
