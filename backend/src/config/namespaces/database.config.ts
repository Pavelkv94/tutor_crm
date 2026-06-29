import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const databaseConfig = registerAs('database', () => ({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  uri: env.POSTGRES_URI,
}));

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
