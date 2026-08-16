import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import { ApiExcludeController } from "@nestjs/swagger";
import { StripeWebhookService } from "@/modules/payments/application/stripe-webhook.service";

/**
 * Публичный эндпоинт Stripe. Без гвардов: аутентификацией служит подпись события.
 *
 * Коды ответов разведены намеренно:
 *  - 400 — подпись не сошлась, повторять нечего;
 *  - 200 — событие принято (в том числе если разбираться должен человек), Stripe не ретраит;
 *  - 500 — транзиентный сбой, Stripe повторит доставку.
 */
@ApiExcludeController()
@Controller("payments/stripe")
export class PaymentsWebhookController {
	constructor(private readonly stripeWebhookService: StripeWebhookService) {}

	@Post("webhook")
	@HttpCode(HttpStatus.OK)
	async handleWebhook(@Req() request: RawBodyRequest<Request>, @Headers("stripe-signature") signature?: string): Promise<{ received: boolean }> {
		if (!signature) {
			throw new BadRequestException("Отсутствует заголовок stripe-signature");
		}
		if (!request.rawBody) {
			throw new BadRequestException("Пустое тело запроса");
		}

		let event: ReturnType<StripeWebhookService["constructEvent"]>;
		try {
			event = this.stripeWebhookService.constructEvent(request.rawBody, signature);
		} catch {
			// Тело и подпись в лог не пишем: это чувствительные данные.
			throw new BadRequestException("Подпись вебхука не прошла проверку");
		}

		await this.stripeWebhookService.handleEvent(event);
		return { received: true };
	}
}
