import { registerAs, ConfigType } from '@nestjs/config';
import { env } from '@/config/bootstrap-env';

export const telegramConfig = registerAs('telegram', () => ({
  botToken: env.TELEGRAM_BOT_TOKEN,
  botName: env.TELEGRAM_BOT_NAME,
  adminId: env.TELEGRAM_ADMIN_ID,
}));

export type TelegramConfig = ConfigType<typeof telegramConfig>;
