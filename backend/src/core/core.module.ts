import { configModule } from "./env-config/env-config.module";
import { CoreEnvConfig } from "./core.config";
import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
	imports: [configModule, PrismaModule, ScheduleModule.forRoot()],
	providers: [CoreEnvConfig],
	exports: [CoreEnvConfig],
})
export class CoreModule {}
