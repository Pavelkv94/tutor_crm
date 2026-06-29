import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Telegram, TelegramToken } from '@/infrastructure/prisma/generated/client';
import { TokenDataInputDto } from '../interface/dto/requests/token-data.input.dto';
import { TelegramInputDto } from '../interface/dto/requests/telegram.input.dto';

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