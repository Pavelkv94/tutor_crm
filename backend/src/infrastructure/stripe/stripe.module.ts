import { Module } from "@nestjs/common";
import Stripe = require("stripe");

import { stripeConfig, StripeConfig } from "@/config/namespaces/stripe.config";
import { STRIPE_CLIENT } from "./stripe.constants";
import { StripeService } from "./stripe.service";

@Module({
	providers: [
		{
			provide: STRIPE_CLIENT,
			inject: [stripeConfig.KEY],
			useFactory: (config: StripeConfig): Stripe => {
				return new Stripe(config.stripeSecretKey, {
					/**
					 * Лучше не задавать apiVersion вручную без необходимости.
					 * Установленная версия stripe-node типизирована под
					 * поддерживаемую ею версию Stripe API.
					 */
					maxNetworkRetries: 2,
					timeout: 20_000,

					appInfo: {
						name: "lessons-api",
						version: "1.0.0",
					},
				});
			},
		},
		StripeService,
	],
	exports: [StripeService],
})
export class StripeModule {}
