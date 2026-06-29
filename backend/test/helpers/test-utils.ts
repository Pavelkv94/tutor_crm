import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { authConfig, AuthConfig } from '../../src/config/namespaces/auth.config';
import { JwtPayloadDto } from '../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../src/modules/teacher/interface/dto/teacherRole';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TelegramService } from '../../src/modules/telegram/application/telegram.service';
import { TelegramModule } from '../../src/modules/telegram/telegram.module';
import { createTelegramTestModule } from './telegram-test.module';
import * as cookieParser from 'cookie-parser';

export interface CreateTestAppOptions {
	useRealTelegramService?: boolean;
}

export interface TestAppContext {
	app: INestApplication;
	module: TestingModule;
	mockTelegramService: {
		generateTelegramLink: jest.Mock;
		sendLessonsCostToAdmin: jest.Mock;
		sendMessageToAdmin: jest.Mock;
		sendMessageToUser: jest.Mock;
		onStart: jest.Mock;
		birthdayRemind: jest.Mock;
		stop: jest.Mock;
		launch: jest.Mock;
		telegram: {
			sendMessage: jest.Mock;
		};
	};
}

/**
 * Creates a test NestJS application instance with mocked Telegram bot
 */
export async function createTestApp(
	options: CreateTestAppOptions = {},
): Promise<TestAppContext> {
	const mockTelegramService = {
		generateTelegramLink: jest.fn(),
		sendLessonsCostToAdmin: jest.fn(),
		sendMessageToAdmin: jest.fn(),
		sendMessageToUser: jest.fn(),
		onStart: jest.fn(),
		birthdayRemind: jest.fn(),
		stop: jest.fn().mockResolvedValue(undefined),
		launch: jest.fn().mockResolvedValue(undefined),
		telegram: {
			sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
		},
	};

	const moduleBuilder = Test.createTestingModule({
		imports: [AppModule],
	})
		.overrideGuard(ThrottlerGuard)
		.useValue({
			canActivate: () => true,
		})
		.overrideModule(TelegramModule)
		.useModule(
			createTelegramTestModule(
				options.useRealTelegramService ? undefined : mockTelegramService,
			),
		);

	const moduleFixture: TestingModule = await moduleBuilder.compile();

	const app = moduleFixture.createNestApplication();
	app.use(cookieParser());
	app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
	await app.init();

	if (options.useRealTelegramService) {
		const telegramService = moduleFixture.get<TelegramService>(TelegramService);
		(telegramService as any).telegram = mockTelegramService.telegram;
	}

	return {
		app,
		module: moduleFixture,
		mockTelegramService,
	};
}

/**
 * Generates a test JWT access token for authenticated requests
 */
export async function generateTestAccessToken(
	jwtService: JwtService,
	auth: AuthConfig,
	payload: Partial<JwtPayloadDto> = {}
): Promise<string> {
	const defaultPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test User',
		role: TeacherRoleEnum.TEACHER,
		...payload,
	};

	return jwtService.signAsync(defaultPayload, {
		secret: auth.accessSecretKey,
		expiresIn: auth.accessExpiresIn as any,
	});
}

/**
 * Generates a test JWT refresh token
 */
export async function generateTestRefreshToken(
	jwtService: JwtService,
	auth: AuthConfig,
	payload: Partial<JwtPayloadDto> = {}
): Promise<string> {
	const defaultPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test User',
		role: TeacherRoleEnum.TEACHER,
		...payload,
	};

	return jwtService.signAsync(defaultPayload, {
		secret: auth.refreshSecretKey,
		expiresIn: auth.refreshExpiresIn as any,
	});
}

/**
 * Generates a test JWT token for admin user
 */
export async function generateTestAdminToken(
	jwtService: JwtService,
	auth: AuthConfig
): Promise<string> {
	return generateTestAccessToken(jwtService, auth, {
		role: TeacherRoleEnum.ADMIN,
		login: 'admin',
		name: 'Admin User',
	});
}

/**
 * Helper to get AuthConfig from a testing module
 */
export function getAuthConfig(module: TestingModule): AuthConfig {
	return module.get<AuthConfig>(authConfig.KEY);
}

/**
 * @deprecated Use getAuthConfig instead
 */
export const getCoreEnvConfig = getAuthConfig;

/**
 * Helper to get JwtService from a testing module
 */
export function getJwtService(module: TestingModule): JwtService {
	return module.get<JwtService>(JwtService);
}

/**
 * Safely closes the NestJS application, handling Telegram bot shutdown errors
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
	try {
		await app.close();
	} catch (error: any) {
		if (error?.message?.includes('Bot is not running') || error?.message?.includes('telegram')) {
			return;
		}
		throw error;
	}
}
