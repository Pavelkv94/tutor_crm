import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { CoreEnvConfig } from '../../src/core/core.config';
import { JwtPayloadDto } from '../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRole } from '@prisma/client';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';

/**
 * Creates a test NestJS application instance
 */
export async function createTestApp(): Promise<INestApplication> {
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideGuard(ThrottlerGuard)
		.useValue({
			canActivate: () => true,
		})
		.compile();

	const app = moduleFixture.createNestApplication();
	app.use(cookieParser());
	app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
	return app;
}

/**
 * Generates a test JWT access token for authenticated requests
 */
export async function generateTestAccessToken(
	jwtService: JwtService,
	coreEnvConfig: CoreEnvConfig,
	payload: Partial<JwtPayloadDto> = {}
): Promise<string> {
	const defaultPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test User',
		role: TeacherRole.TEACHER,
		...payload,
	};

	return jwtService.signAsync(defaultPayload, {
		secret: coreEnvConfig.accessSecretKey,
		expiresIn: coreEnvConfig.accessExpiresIn as any,
	});
}

/**
 * Generates a test JWT refresh token
 */
export async function generateTestRefreshToken(
	jwtService: JwtService,
	coreEnvConfig: CoreEnvConfig,
	payload: Partial<JwtPayloadDto> = {}
): Promise<string> {
	const defaultPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test User',
		role: TeacherRole.TEACHER,
		...payload,
	};

	return jwtService.signAsync(defaultPayload, {
		secret: coreEnvConfig.refreshSecretKey,
		expiresIn: coreEnvConfig.refreshExpiresIn as any,
	});
}

/**
 * Generates a test JWT token for admin user
 */
export async function generateTestAdminToken(
	jwtService: JwtService,
	coreEnvConfig: CoreEnvConfig
): Promise<string> {
	return generateTestAccessToken(jwtService, coreEnvConfig, {
		role: TeacherRole.ADMIN,
		login: 'admin',
		name: 'Admin User',
	});
}

/**
 * Helper to get CoreEnvConfig from a testing module
 */
export function getCoreEnvConfig(module: TestingModule): CoreEnvConfig {
	return module.get<CoreEnvConfig>(CoreEnvConfig);
}

/**
 * Helper to get JwtService from a testing module
 */
export function getJwtService(module: TestingModule): JwtService {
	return module.get<JwtService>(JwtService);
}

