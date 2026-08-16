import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards, ValidationPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAccessGuard } from "@/shared/guards/jwt-access.guard";
import { AdminAccessGuard } from "@/shared/guards/admin-access.guard";
import { ExtractTeacherFromRequest } from "@/shared/decorators/param/extract-teacher-from-request";
import { JwtPayloadDto } from "@/modules/auth/dto/jwt.payload.dto";
import { PaymentsService } from "@/modules/payments/application/payments.service";
import { CreateInvoiceDto } from "@/modules/payments/interface/dto/requests/create-invoice.dto";
import { AdjustBalanceDto } from "@/modules/payments/interface/dto/requests/adjust-balance.dto";
import { PaymentsFilterQueryDto } from "@/modules/payments/interface/dto/requests/payments-filter.query.dto";
import { AdjustBalanceResultDto, BalanceDto, InvoiceDto } from "@/modules/payments/interface/dto/responses/invoice.dto";
import { PaymentDto } from "@/modules/payments/interface/dto/responses/payment.dto";
import { mapPaymentToResponse } from "@/modules/payments/interface/mappers/payment-response.mapper";
import { AdjustBalanceSwagger } from "@/shared/decorators/swagger/payments/adjust-balance-swagger.decorator";
import { ApplyPaymentSwagger } from "@/shared/decorators/swagger/payments/apply-payment-swagger.decorator";
import { CancelInvoiceSwagger } from "@/shared/decorators/swagger/payments/cancel-invoice-swagger.decorator";
import { CreateInvoiceSwagger } from "@/shared/decorators/swagger/payments/create-invoice-swagger.decorator";
import { GetBalanceSwagger } from "@/shared/decorators/swagger/payments/get-balance-swagger.decorator";
import { GetPaymentsSwagger } from "@/shared/decorators/swagger/payments/get-payments-swagger.decorator";

@ApiTags("Payments")
@Controller("payments")
@UseGuards(JwtAccessGuard, AdminAccessGuard)
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}

	@CreateInvoiceSwagger()
	@Post("invoices")
	@HttpCode(HttpStatus.CREATED)
	async createInvoice(@Body() dto: CreateInvoiceDto, @ExtractTeacherFromRequest() teacher: JwtPayloadDto): Promise<InvoiceDto> {
		const { from, to } = this.paymentsService.parsePeriod(dto.start_date, dto.end_date);
		// Ручное выставление должно сообщать о проблеме вызывающему, а не молча пропускать,
		// как это делает крон.
		const invoice = await this.paymentsService.createInvoice({
			studentId: dto.student_id,
			from,
			to,
			createdById: Number(teacher.id),
			throwOnSkip: true,
		});
		return invoice as InvoiceDto;
	}

	@CancelInvoiceSwagger()
	@Delete("invoices/:id")
	@HttpCode(HttpStatus.NO_CONTENT)
	async cancelInvoice(@Param("id", ParseIntPipe) id: number): Promise<void> {
		await this.paymentsService.cancelInvoice(id);
	}

	@GetPaymentsSwagger()
	@Get()
	@HttpCode(HttpStatus.OK)
	// Глобальный ValidationPipe поднят без transform, поэтому @Type(() => Number|Date) из
	// PaymentsFilterQueryDto к значению хендлера не применяется и в Prisma уходят строки.
	// Локальный пайп включает преобразование только для этого роута.
	async list(@Query(new ValidationPipe({ transform: true })) query: PaymentsFilterQueryDto): Promise<PaymentDto[]> {
		const payments = await this.paymentsService.list(query);
		return payments.map(mapPaymentToResponse);
	}

	@GetBalanceSwagger()
	@Get("students/:student_id/balance")
	@HttpCode(HttpStatus.OK)
	async getBalance(@Param("student_id", ParseIntPipe) studentId: number): Promise<BalanceDto> {
		return this.paymentsService.getBalance(studentId);
	}

	@AdjustBalanceSwagger()
	@Post("students/:student_id/balance/adjust")
	@HttpCode(HttpStatus.OK)
	async adjustBalance(
		@Param("student_id", ParseIntPipe) studentId: number,
		@Body() dto: AdjustBalanceDto,
		@ExtractTeacherFromRequest() teacher: JwtPayloadDto,
	): Promise<AdjustBalanceResultDto> {
		return this.paymentsService.adjustBalance(studentId, dto, Number(teacher.id));
	}

	@ApplyPaymentSwagger()
	@Post(":id/apply")
	@HttpCode(HttpStatus.OK)
	async applyPayment(@Param("id", ParseIntPipe) id: number): Promise<AdjustBalanceResultDto> {
		return this.paymentsService.applyParkedPayment(id);
	}
}
