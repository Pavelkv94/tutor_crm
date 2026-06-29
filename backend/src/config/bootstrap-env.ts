import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import { validateEnv } from './validation/env.validation';

export enum Environments {
	DEVELOPMENT = 'development',
	STAGING = 'staging',
	PRODUCTION = 'production',
	TESTING = 'testing',
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

dotenvConfig({ path: `.env.${nodeEnv}`, override: false });
dotenvConfig({ path: '.env', override: false });

export const env = validateEnv(process.env);
export type AppEnv = typeof env;
