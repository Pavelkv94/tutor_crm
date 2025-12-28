import { PrismaService } from 'src/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramRepository {
	constructor(private readonly prisma: PrismaService) { }
}