import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

/**
 * Runs Prisma migrations before E2E tests
 * This ensures the test database schema is up to date
 */
export default async function setupMigrations() {
	// Load environment variables from .env.testing.local
	const envPath = path.resolve(__dirname, '../.env.testing.local');
	
	if (!fs.existsSync(envPath)) {
		console.warn(`Warning: .env.testing.local not found at ${envPath}`);
		console.warn('Skipping migrations. Make sure .env.testing.local exists with DATABASE_URL');
		return;
	}
	
	dotenv.config({ path: envPath });
	
	console.log('Running Prisma migrations for test database...');
	console.log('DATABASE_URL:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'Not set');
	
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL not found in environment variables');
		throw new Error('DATABASE_URL is required for migrations');
	}
	
	try {
		const schemaPath = path.resolve(__dirname, '../src/core/prisma/schema.prisma');
		
		// First, generate Prisma client to ensure it's up to date
		console.log('Generating Prisma client...');
		execSync(
			`npx prisma generate --schema=${schemaPath}`,
			{
				stdio: 'pipe',
				env: {
					...process.env,
					DATABASE_URL: process.env.DATABASE_URL,
				},
			}
		);
		
		// Use db push for test databases - it syncs schema without requiring migrations
		// This is better for test databases that might be reset frequently
		console.log('Pushing database schema...');
		execSync(
			`npx prisma db push --schema=${schemaPath} --accept-data-loss --skip-generate`,
			{
				stdio: 'inherit',
				env: {
					...process.env,
					DATABASE_URL: process.env.DATABASE_URL,
				},
			}
		);
		console.log('✓ Database schema synced successfully');
	} catch (error: any) {
		console.error('Failed to run migrations:', error.message);
		if (error.stdout) console.error('stdout:', error.stdout.toString());
		if (error.stderr) console.error('stderr:', error.stderr.toString());
		throw error;
	}
}

