import { Test, TestingModule } from '@nestjs/testing';
import { TelegramRepository } from '../../../src/modules/telegram/telegram.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { TokenDataInputDto } from '../../../src/modules/telegram/dto/token-data.input.dto';
import { TelegramInputDto } from '../../../src/modules/telegram/dto/telegram.input.dto';
import { TelegramUserEnum } from '../../../src/modules/telegram/dto/telegram-user.enum';

describe('TelegramRepository', () => {
	let repository: TelegramRepository;
	let prisma: PrismaService;

	const mockTelegramToken = {
		id: 1,
		token: 'test-token-uuid',
		expired_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
		teacher_id: 1,
		student_id: null,
		type: TelegramUserEnum.TEACHER,
	};

	const mockTelegramUser = {
		id: 1,
		telegram_id: '123456789',
		username: 'testuser',
		first_name: 'Test',
		type: TelegramUserEnum.TEACHER,
		teacher_id: 1,
		student_id: null,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TelegramRepository,
				{
					provide: PrismaService,
					useValue: {
						telegramToken: {
							create: jest.fn(),
							findUnique: jest.fn(),
							delete: jest.fn(),
						},
						telegram: {
							findUnique: jest.fn(),
							create: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<TelegramRepository>(TelegramRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('createTelegramToken', () => {
		it('should create telegram token', async () => {
			const tokenData: TokenDataInputDto = {
				token: 'test-token-uuid',
				expired_at: new Date(),
				teacher_id: 1,
				student_id: null,
				type: TelegramUserEnum.TEACHER,
			};

			jest.spyOn(prisma.telegramToken, 'create').mockResolvedValue(mockTelegramToken as any);

			const result = await repository.createTelegramToken(tokenData);

			expect(result).toEqual(mockTelegramToken);
			expect(prisma.telegramToken.create).toHaveBeenCalledWith({
				data: tokenData,
			});
		});
	});

	describe('getTelegramTokenByToken', () => {
		it('should return telegram token by token', async () => {
			const token = 'test-token-uuid';
			jest.spyOn(prisma.telegramToken, 'findUnique').mockResolvedValue(mockTelegramToken as any);

			const result = await repository.getTelegramTokenByToken(token);

			expect(result).toEqual(mockTelegramToken);
			expect(prisma.telegramToken.findUnique).toHaveBeenCalledWith({
				where: { token },
			});
		});

		it('should return null when token not found', async () => {
			const token = 'non-existent-token';
			jest.spyOn(prisma.telegramToken, 'findUnique').mockResolvedValue(null);

			const result = await repository.getTelegramTokenByToken(token);

			expect(result).toBeNull();
			expect(prisma.telegramToken.findUnique).toHaveBeenCalledWith({
				where: { token },
			});
		});

	});

	describe('deleteTelegramToken', () => {
		it('should delete telegram token', async () => {
			const id = 1;
			jest.spyOn(prisma.telegramToken, 'delete').mockResolvedValue(mockTelegramToken as any);

			await repository.deleteTelegramToken(id);

			expect(prisma.telegramToken.delete).toHaveBeenCalledWith({
				where: { id },
			});
		});
	});

	describe('findTelegramByTelegramId', () => {
		it('should return telegram user by telegram id', async () => {
			const telegramId = '123456789';
			jest.spyOn(prisma.telegram, 'findUnique').mockResolvedValue(mockTelegramUser as any);

			const result = await repository.findTelegramByTelegramId(telegramId);

			expect(result).toEqual(mockTelegramUser);
			expect(prisma.telegram.findUnique).toHaveBeenCalledWith({
				where: { telegram_id: telegramId },
			});
		});

		it('should return null when telegram user not found', async () => {
			const telegramId = 'non-existent-id';
			jest.spyOn(prisma.telegram, 'findUnique').mockResolvedValue(null);

			const result = await repository.findTelegramByTelegramId(telegramId);

			expect(result).toBeNull();
		});
	});

	describe('createTelegramUser', () => {
		it('should create telegram user', async () => {
			const telegramData: TelegramInputDto = {
				telegram_id: '123456789',
				username: 'testuser',
				first_name: 'Test',
				type: TelegramUserEnum.TEACHER,
				teacher_id: 1,
				student_id: null,
			};

			jest.spyOn(prisma.telegram, 'create').mockResolvedValue(mockTelegramUser as any);

			const result = await repository.createTelegramUser(telegramData);

			expect(result).toEqual(mockTelegramUser);
			expect(prisma.telegram.create).toHaveBeenCalledWith({
				data: telegramData,
			});
		});
	});
});

