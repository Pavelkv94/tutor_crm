import { ConfigType, registerAs } from "@nestjs/config";
import { env } from '@/config/bootstrap-env';

export const corsConfig = registerAs("cors", () => ({
	allowedOrigins: env.ORIGIN_URLS.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean),
	credentials: true,
}));

export type CorsConfig = ConfigType<typeof corsConfig>;
