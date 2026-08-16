import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { InvoiceDto } from "@/modules/payments/interface/dto/responses/invoice.dto";

export const CreateInvoiceSwagger = () =>
	applyDecorators(
		ApiOperation({
			summary: "Выставить счёт за период",
			description:
				"Сначала расходует остаток баланса, затем считает неоплаченные занятия периода. " +
				"Валюта берётся из планов занятий. Для PLN/EUR создаёт Payment Link, для BYN — счёт без ссылки. " +
				"Отчёт уходит администратору в Telegram.",
		}),
		ApiCreatedResponse({ description: "Счёт выставлен", type: InvoiceDto }),
		ApiBadRequestResponse({
			description: "Нет занятий к оплате, занятия в разных валютах или остаток баланса в другой валюте",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({ description: "Студент не найден" }),
		ApiBearerAuth(),
	);
