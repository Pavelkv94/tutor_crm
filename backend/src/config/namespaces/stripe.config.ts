import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const stripeConfig = registerAs('stripe', () => ({
	stripeSecretKey: env.STRIPE_SECRET_KEY,
	stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
}));

export type StripeConfig = ConfigType<typeof stripeConfig>;
