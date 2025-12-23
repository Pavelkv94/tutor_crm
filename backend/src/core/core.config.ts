import { configValidationUtility } from "../utils/env-validation.utility";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsNotEmpty, IsString } from "class-validator";

export enum Environments {
	DEVELOPMENT = "development",
	STAGING = "staging",
	PRODUCTION = "production",
	TESTING = "testing",
}

@Injectable()
export class CoreEnvConfig {
	@IsNotEmpty({
		message: "Set Env variable DATABASE_URL, example: postgresql://user:password@host:port/database",
	})
	databaseUrl: string;

	@IsNotEmpty({
		message: "Set Env variable PORT, example: 5000",
	})
	port: number;

	@IsNotEmpty({
		message: "Set Env variable TELEGRAM_BOT_TOKEN, example: 1234567890",
	})
	telegramBotToken: string;

	@IsNotEmpty({
		message: "Set Env variable REFRESH_SECRET_KEY, example: 1234567890",
	})
	refreshSecretKey: string;

	@IsNotEmpty({
		message: "Set Env variable REFRESH_EXPIRES_IN, example: 1h",
	})
	refreshExpiresIn: string;

	@IsNotEmpty({
		message: "Set Env variable ACCESS_SECRET_KEY, example: 1234567890",
	})
	accessSecretKey: string;

	@IsNotEmpty({
		message: "Set Env variable ACCESS_EXPIRES_IN, example: 1h",
	})
	accessExpiresIn: string;

	@IsNotEmpty({
		message: "Set Env variable ADMIN_REGISTRATION_SECRET_KEY, example: 1234567890",
	})
	adminRegistrationSecretKey: string;
	
	@IsString()
	@IsNotEmpty({
		message: "Set Env variable NODE_ENV, example: development",
	})
	env: string;

	constructor(private configService: ConfigService<any, true>) {
		this.databaseUrl = this.configService.get<string>("DATABASE_URL");
		this.port = this.configService.get<number>("PORT");
		this.telegramBotToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
		this.refreshSecretKey = this.configService.get<string>("REFRESH_SECRET_KEY");
		this.refreshExpiresIn = this.configService.get<string>("REFRESH_EXPIRES_IN");
		this.accessSecretKey = this.configService.get<string>("ACCESS_SECRET_KEY");
		this.accessExpiresIn = this.configService.get<string>("ACCESS_EXPIRES_IN");
		this.adminRegistrationSecretKey = this.configService.get<string>("ADMIN_REGISTRATION_SECRET_KEY");
		this.env = this.configService.get<string>("NODE_ENV");


		configValidationUtility.validateConfig(this);
	}
}
