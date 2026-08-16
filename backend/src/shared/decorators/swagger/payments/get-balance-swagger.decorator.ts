import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BalanceDto } from "@/modules/payments/interface/dto/responses/invoice.dto";

export const GetBalanceSwagger = () =>
	applyDecorators(
		ApiOperation({ summary: "Баланс ученика и занятия, оплаченные с него" }),
		ApiOkResponse({ description: "Баланс и активные аллокации", type: BalanceDto }),
		ApiNotFoundResponse({ description: "Студент не найден" }),
		ApiBearerAuth(),
	);
