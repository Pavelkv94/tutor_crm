import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { SalaryInvoiceOutputDto } from "@/modules/reports/interface/dto/responses/salary-invoice.output.dto";

export const GenerateSalaryInvoiceSwagger = () =>
	applyDecorators(
		ApiOperation({
			summary: "Сформировать счёт преподавателя за период",
			description:
				"Собирает PDF-счёт (rachunek) по проведённым занятиям и дополнительным услугам. " +
				"Ставки за занятие задаёт администратор, суммы считает сервер. " +
				"Готовый файл уходит администратору или преподавателю в Telegram.",
		}),
		ApiCreatedResponse({ description: "Счёт сформирован", type: SalaryInvoiceOutputDto }),
		ApiBadRequestResponse({
			description: "Не заполнены реквизиты преподавателя, нулевая сумма счёта или у преподавателя не привязан Telegram",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({ description: "Преподаватель не найден" }),
		ApiBearerAuth(),
	);
