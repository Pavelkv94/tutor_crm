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
	process.env.LOG_LEVEL ??= 'error';

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

		console.log('Pushing database schema...');
		execSync(
			`npx prisma db push --schema=${schemaPath} --accept-data-loss`,
			{
				stdio: 'inherit',
				env: {
					...process.env,
					POSTGRES_URI: databaseUrl,
					DATABASE_URL: databaseUrl,
				},
			},
		);
		console.log('✓ Database schema synced successfully');
	} catch (error: any) {
		console.error('Failed to run migrations:', error.message);
		if (error.stdout) console.error('stdout:', error.stdout.toString());
		if (error.stderr) console.error('stderr:', error.stderr.toString());
		throw error;
	}
}
