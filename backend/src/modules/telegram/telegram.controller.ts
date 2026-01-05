import { Controller, HttpCode, HttpStatus, Post, UseGuards, Body } from "@nestjs/common";
import { JwtAccessGuard } from "src/core/guards/jwt-access.guard";
import { AdminAccessGuard } from "src/core/guards/admin-access.guard";
import { GenerateTelegramLinkSwagger } from "../../core/decorators/swagger/telegram/generate-telegram-link-swagger.decorator";
import { TelegramLinkOutputDto } from "./dto/telegram-link.output.dto";
import { TelegramService } from "./telegram.service";
import { ApiTags } from "@nestjs/swagger";
import { TelegramLinkInputDto } from "./dto/telegram-link.input.dto";
import { LessonsCostFiltersDto } from "./dto/lessons-cost-filter.input.dto";
import { ExtractTeacherFromRequest } from "src/core/decorators/param/extract-teacher-from-request";
import { JwtPayloadDto } from "../auth/dto/jwt.payload.dto";
import { SendLessonsCostToAdminSwagger } from "src/core/decorators/swagger/telegram/send-lessons-cost-to-admin-swagger.decorator";


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