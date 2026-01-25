import { PrismaService } from 'src/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Telegram, TelegramToken } from '@prisma/client';
import { TokenDataInputDto } from './dto/token-data.input.dto';
import { TelegramInputDto } from './dto/telegram.input.dto';

@Injectable()
export class TelegramRepository {
	constructor(private readonly prisma: PrismaService) { }

	async createTelegramToken(telegramToken: TokenDataInputDto): Promise<TelegramToken> {
		return await this.prisma.telegramToken.create({
			data: telegramToken,
		});
	}

	async getTelegramTokenByToken(token: string): Promise<TelegramToken | null> {
		const tokenData = await this.prisma.telegramToken.findUnique({
			where: { token },
		});
		if (!tokenData) {
			return null;
		}
		return tokenData;
	}

	async deleteTelegramToken(id: number): Promise<void> {
		await this.prisma.telegramToken.delete({
			where: { id },
		});
	}

	async findTelegramByTelegramId(telegramId: string): Promise<Telegram | null> {
		console.log('telegramId repository', telegramId);
		const telegrams = await this.prisma.telegram.findMany();
		console.log('telegrams', telegrams);
		const telegram = await this.prisma.telegram.findUnique({
			where: { telegram_id: telegramId },
		});
		if (!telegram) {
			return null;
		}
		return telegram;
	}

	async createTelegramUser(telegramData: TelegramInputDto): Promise<Telegram> {
		return await this.prisma.telegram.create({
			data: telegramData,
		});
	}
}