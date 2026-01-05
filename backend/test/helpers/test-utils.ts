import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { CoreEnvConfig } from '../../src/core/core.config';
import { JwtPayloadDto } from '../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRole } from '@prisma/client';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TelegramService } from '../../src/modules/telegram/telegram.service';
import * as cookieParser from 'cookie-parser';
import { TelegrafModule } from 'nestjs-telegraf';

/**
 * Creates a test NestJS application instance
 */
export async function createTestApp(): Promise<INestApplication> {
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

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			AppModule,
			// Override TelegrafModule to prevent bot initialization
			TelegrafModule.forRoot({
				token: 'mock-token-for-testing',
			}),
		],
	})
		.overrideGuard(ThrottlerGuard)
		.useValue({
			canActivate: () => true,
		})
		.overrideProvider(TelegramService)
		.useValue(mockTelegramService as any)
		.compile();

	const app = moduleFixture.createNestApplication();
	app.use(cookieParser());
	app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
	
	// Get the actual TelegramService instance and replace its telegram property
	try {
		const telegramService = moduleFixture.get<TelegramService>(TelegramService, { strict: false });
		if (telegramService) {
			(telegramService as any).telegram = mockTelegramService.telegram;
			(telegramService as any).stop = mockTelegramService.stop;
			(telegramService as any).launch = mockTelegramService.launch;
		}
	} catch (e) {
		// Ignore if TelegramService is not found
	}
	
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

/**
 * Safely closes the NestJS application, handling Telegram bot shutdown errors
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
	try {
		await app.close();
	} catch (error: any) {
		// Ignore Telegram bot shutdown errors in tests
		if (error?.message?.includes('Bot is not running') || error?.message?.includes('telegram')) {
			// Silently ignore telegram bot errors during test teardown
			return;
		}
		throw error;
	}
}

