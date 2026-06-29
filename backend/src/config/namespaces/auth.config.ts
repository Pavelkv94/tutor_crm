import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const authConfig = registerAs('auth', () => ({
  accessSecretKey: env.ACCESS_SECRET_KEY,
  accessExpiresIn: env.ACCESS_EXPIRES_IN,
  refreshSecretKey: env.REFRESH_SECRET_KEY,
  refreshExpiresIn: env.REFRESH_EXPIRES_IN,
  adminRegistrationSecretKey: env.ADMIN_REGISTRATION_SECRET_KEY,
}));

export type AuthConfig = ConfigType<typeof authConfig>;
