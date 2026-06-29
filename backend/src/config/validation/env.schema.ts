import { IsDefined, IsString, Min, Max, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class EnvSchema {
  @IsString()
  @IsDefined()
  LOG_LEVEL: string;

  @IsString()
  @IsDefined()
  POSTGRES_USER: string;

  @IsString()
  @IsDefined()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsDefined()
  POSTGRES_HOST: string;

  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT: number;

  @IsString()
  @IsDefined()
  POSTGRES_DB: string;

  @IsString()
  @IsDefined()
  POSTGRES_URI: string;

  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
	PORT: number;

	@IsString()
	@IsDefined()
	TELEGRAM_BOT_TOKEN: string;

	@IsString()
	@IsDefined()
	TELEGRAM_BOT_NAME: string;

	@IsString()
	@IsDefined()
	TELEGRAM_ADMIN_ID: string;

	@IsString()
	@IsDefined()
	REFRESH_SECRET_KEY: string;

	@IsString()
	@IsDefined()
	REFRESH_EXPIRES_IN: string;

	@IsString()
	@IsDefined()
	ACCESS_SECRET_KEY: string;

	@IsString()
	@IsDefined()
	ACCESS_EXPIRES_IN: string;

	@IsString()
	@IsDefined()
	ADMIN_REGISTRATION_SECRET_KEY: string;

	@IsString()
	@IsDefined()
	ORIGIN_URLS: string;

}
