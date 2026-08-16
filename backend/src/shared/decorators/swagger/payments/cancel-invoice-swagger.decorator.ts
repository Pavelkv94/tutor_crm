import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const CancelInvoiceSwagger = () =>
	applyDecorators(
		ApiOperation({ summary: "Отменить неоплаченный счёт и деактивировать его ссылку" }),
		ApiNoContentResponse({ description: "Счёт отменён" }),
		ApiBadRequestResponse({ description: "Счёт уже оплачен или отменён", type: BadRequestErrorResponse }),
		ApiNotFoundResponse({ description: "Счёт не найден" }),
		ApiBearerAuth(),
	);
