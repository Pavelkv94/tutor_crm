import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const loggerConfig = registerAs('logger', () => ({
  level: env.LOG_LEVEL,
}));

export type LoggerConfig = ConfigType<typeof loggerConfig>;
