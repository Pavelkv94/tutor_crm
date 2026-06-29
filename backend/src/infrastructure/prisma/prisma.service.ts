import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/infrastructure/prisma/generated/client';
import { databaseConfig, DatabaseConfig } from '@/config/namespaces/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    public constructor(@Inject(databaseConfig.KEY) private readonly cfg: DatabaseConfig) {
        const adapter = new PrismaPg({
            user: cfg.user,
            password: cfg.password,
            host: cfg.host,
            port: cfg.port,
            database: cfg.database,
        });
        super({
            adapter,
        });
    }

	public async onModuleInit() {
        const start = Date.now();
		this.logger.log('Connecting to database...');
        try {
            await this.$connect();
        } catch (error) {
            this.logger.error('Error connecting to database:', error);
            throw error;
        }
        const end = Date.now();
        this.logger.log(`Connected to database in ${end - start}ms`);
	}

	public async onModuleDestroy() {
        const start = Date.now();
		this.logger.log('Disconnecting from database...');
        try {
            await this.$disconnect();
        } catch (error) {
            this.logger.error('Error disconnecting from database:', error);
            throw error;
        }
        const end = Date.now();
        this.logger.log(`Disconnected from database in ${end - start}ms`);
	}
}
