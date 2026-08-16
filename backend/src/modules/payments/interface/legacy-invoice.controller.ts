import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "@/shared/guards/jwt-access.guard";
import { AdminAccessGuard } from "@/shared/guards/admin-access.guard";
import { ExtractTeacherFromRequest } from "@/shared/decorators/param/extract-teacher-from-request";
import { JwtPayloadDto } from "@/modules/auth/dto/jwt.payload.dto";
import { PaymentsService } from "@/modules/payments/application/payments.service";
import { CreateInvoiceDto } from "@/modules/payments/interface/dto/requests/create-invoice.dto";
import { SendLessonsCostToAdminSwagger } from "@/shared/decorators/swagger/telegram/send-lessons-cost-to-admin-swagger.decorator";

/**
 * Старый маршрут выставления счёта. Логика переехала в PaymentsService, но фронтенд
 * продолжает ходить сюда, поэтому контракт сохранён полностью: тело, гварды и 204 без ответа.
 * Канонический маршрут — POST /api/payments/invoices.
 *
 * Контроллер живёт в PaymentsModule, а не в TelegramModule: зависимость строго
 * Payments → Telegram, обратная превратила бы граф модулей в цикл.
 */
@ApiTags("Telegram")
@Controller("telegram")
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class LegacyInvoiceController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@SendLessonsCostToAdminSwagger()
	@Post("send-lessons-cost-to-admin")
	@HttpCode(HttpStatus.NO_CONTENT)
	async sendLessonsCostToAdmin(@Body() dto: CreateInvoiceDto, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<void> {
		const { from, to } = this.paymentsService.parsePeriod(dto.start_date, dto.end_date);
		await this.paymentsService.createInvoice({
			studentId: dto.student_id,
			from,
			to,
			createdById: Number(teacher.id),
			throwOnSkip: true,
		});
	}
}
