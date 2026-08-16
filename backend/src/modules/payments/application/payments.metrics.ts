import { Injectable } from "@nestjs/common";
import { InjectMetric, makeCounterProvider } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";

export const PAYMENTS_TOTAL = "payments_total";
export const STRIPE_WEBHOOK_EVENTS_TOTAL = "stripe_webhook_events_total";

export const paymentsMetricsProviders = [
	makeCounterProvider({
		name: PAYMENTS_TOTAL,
		help: "Денежные операции по балансу учеников",
		labelNames: ["type", "status"],
	}),
	makeCounterProvider({
		name: STRIPE_WEBHOOK_EVENTS_TOTAL,
		help: "События вебхука Stripe",
		labelNames: ["type", "result"],
	}),
];

@Injectable()
export class PaymentsMetrics {
	constructor(
		@InjectMetric(PAYMENTS_TOTAL) private readonly payments: Counter<string>,
		@InjectMetric(STRIPE_WEBHOOK_EVENTS_TOTAL) private readonly webhookEvents: Counter<string>,
	) {}

	payment(type: string, status: string): void {
		this.payments.inc({ type, status });
	}

	webhookEvent(type: string, result: string): void {
		this.webhookEvents.inc({ type, result });
	}
}
