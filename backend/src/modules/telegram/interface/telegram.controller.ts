import { Controller, HttpCode, HttpStatus, Post, UseGuards, Body } from "@nestjs/common";

import { TelegramLinkOutputDto } from "@/modules/telegram/interface/dto/responses/telegram-link.output.dto";
import { TelegramService } from "@/modules/telegram/application/telegram.service";
import { ApiTags } from "@nestjs/swagger";
import { TelegramLinkInputDto } from "@/modules/telegram/interface/dto/requests/telegram-link.input.dto";
import { LessonsCostFiltersDto } from "@/modules/telegram/interface/dto/requests/lessons-cost-filter.input.dto";
import { JwtPayloadDto } from "@/modules/auth/dto/jwt.payload.dto";
import { JwtAccessGuard } from '@/shared/guards/jwt-access.guard';
import { AdminAccessGuard } from '@/shared/guards/admin-access.guard';
import { GenerateTelegramLinkSwagger } from '@/shared/decorators/swagger/telegram/generate-telegram-link-swagger.decorator';
import { SendLessonsCostToAdminSwagger } from '@/shared/decorators/swagger/telegram/send-lessons-cost-to-admin-swagger.decorator';
import { ExtractTeacherFromRequest } from '@/shared/decorators/param/extract-teacher-from-request';

@ApiTags('Telegram')
@Controller('telegram')
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class TelegramController {
	constructor(private readonly telegramService: TelegramService) { }

	@GenerateTelegramLinkSwagger()
	@Post('generate-telegram-link')
	@HttpCode(HttpStatus.OK)
	async generateTelegramLink(@Body() telegramLinkInputDto: TelegramLinkInputDto): Promise<TelegramLinkOutputDto> {
		return await this.telegramService.generateTelegramLink(telegramLinkInputDto);
	}

	@SendLessonsCostToAdminSwagger()
	@Post('send-lessons-cost-to-admin')
	@HttpCode(HttpStatus.NO_CONTENT)
	async sendLessonsCostToAdmin(@Body() dto: LessonsCostFiltersDto, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<void> {
		await this.telegramService.sendLessonsCostToAdmin(dto, teacher);
	}

}