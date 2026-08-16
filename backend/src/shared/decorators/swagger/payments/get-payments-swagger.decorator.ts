import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { PaymentDto } from "@/modules/payments/interface/dto/responses/payment.dto";

export const GetPaymentsSwagger = () =>
	applyDecorators(
		ApiOperation({ summary: "История платежей и корректировок баланса" }),
		ApiOkResponse({ description: "Список операций", type: [PaymentDto] }),
		ApiBearerAuth(),
	);
