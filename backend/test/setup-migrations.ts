import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

/**
 * Runs Prisma migrations before E2E tests
 * This ensures the test database schema is up to date
 */
export default async function setupMigrations() {
	const envPath = path.resolve(__dirname, '../.env.testing');

	if (!fs.existsSync(envPath)) {
		console.warn(`Warning: .env.testing not found at ${envPath}`);
		console.warn('Skipping migrations. Make sure .env.testing exists with POSTGRES_URI');
		return;
	}

	dotenv.config({ path: envPath });

	process.env.NODE_ENV ??= 'testing';

	const databaseUrl = process.env.POSTGRES_URI ?? process.env.DATABASE_URL;

	console.log('Running Prisma migrations for test database...');
	console.log(
		'Database URL:',
		databaseUrl ? `${databaseUrl.substring(0, 30)}...` : 'Not set',
	);

	if (!databaseUrl) {
		console.error('POSTGRES_URI (or DATABASE_URL) not found in environment variables');
		throw new Error('POSTGRES_URI is required for migrations');
	}

	try {
		const schemaPath = path.resolve(__dirname, '../src/infrastructure/prisma/schema.prisma');

		console.log('Generating Prisma client...');
		execSync(`npx prisma generate --schema=${schemaPath}`, {
			stdio: 'pipe',
			env: {
				...process.env,
				POSTGRES_URI: databaseUrl,
				DATABASE_URL: databaseUrl,
			},
		});

		const pushEnv = {
			...process.env,
			POSTGRES_URI: databaseUrl,
			DATABASE_URL: databaseUrl,
		};

		console.log('Pushing database schema...');
		try {
			execSync(`npx prisma db push --schema=${schemaPath} --accept-data-loss`, { stdio: 'inherit', env: pushEnv });
		} catch {
			// Несовместимые изменения (например, смена типа enum на непустой колонке) `db push`
			// применить не может. База тестовая и одноразовая — пересоздаём её целиком,
			// каждый spec всё равно готовит свои данные сам.
			console.warn('db push failed, recreating the test database from scratch...');
			execSync(`npx prisma db push --schema=${schemaPath} --force-reset --accept-data-loss`, { stdio: 'inherit', env: pushEnv });
		}
		console.log('✓ Database schema synced successfully');

		await applyHandWrittenConstraints(databaseUrl);
	} catch (error: any) {
		console.error('Failed to run migrations:', error.message);
		if (error.stdout) console.error('stdout:', error.stdout.toString());
		if (error.stderr) console.error('stderr:', error.stderr.toString());
		throw error;
	}
}

/**
 * `prisma db push` строит схему по schema.prisma и не видит того, что Prisma выразить
 * не умеет: частичных unique-индексов и CHECK-констрейнтов из migration.sql. Без них
 * e2e не проверял бы ни защиту от двойной оплаты занятия, ни инвариант валюты баланса,
 * поэтому дописываем их вручную.
 */
async function applyHandWrittenConstraints(databaseUrl: string): Promise<void> {
	const { Client } = require('pg');
	const client = new Client({ connectionString: databaseUrl });
	await client.connect();

	try {
		// Не больше одной активной аллокации на занятие — защита от двойной оплаты.
		await client.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "lesson_payment_active_lesson_key"
				ON "lesson_payment" ("lesson_id") WHERE "reverted_at" IS NULL
		`);

		// Не больше одного PENDING-счёта на ученика за период.
		await client.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "payment_pending_period_key"
				ON "payment" ("student_id", "period_start", "period_end")
				WHERE "status" = 'PENDING' AND "type" = 'STRIPE_PAYMENT'
		`);

		// Валюта задана тогда и только тогда, когда на балансе есть деньги.
		await client.query(`ALTER TABLE "student" DROP CONSTRAINT IF EXISTS "student_balance_currency_check"`);
		await client.query(`
			ALTER TABLE "student" ADD CONSTRAINT "student_balance_currency_check"
				CHECK (("balance" = 0 AND "balance_currency" IS NULL) OR ("balance" <> 0 AND "balance_currency" IS NOT NULL))
		`);

		console.log('✓ Hand-written indexes and constraints applied');
	} finally {
		await client.end();
	}
}
