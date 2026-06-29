import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const httpConfig = registerAs('http', () => ({
  port: env.PORT,
}));

export type HttpConfig = ConfigType<typeof httpConfig>;
