import { ConfigType, registerAs } from "@nestjs/config";
import { env } from '@/config/bootstrap-env';

export const storageConfig = registerAs("storage", () => ({
	accountId: env.R2_ACCOUNT_ID,
	bucket: env.R2_BUCKET,
	accessKeyId: env.R2_ACCESS_KEY_ID,
	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
}));

export type StorageConfig = ConfigType<typeof storageConfig>;
