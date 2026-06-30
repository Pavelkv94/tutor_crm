import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { authConfig } from '@/config/namespaces/auth.config';
import { databaseConfig } from '@/config/namespaces/database.config';
import { telegramConfig } from '@/config/namespaces/telegram.config';
import { corsConfig } from '@/config/namespaces/cors.config';
import { httpConfig } from '@/config/namespaces/http.config';
import { observabilityConfig } from '@/observability/observability.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
			load: [databaseConfig, authConfig, telegramConfig, corsConfig, httpConfig, observabilityConfig],
    }),
  ],
})
export class AppConfigModule {}
