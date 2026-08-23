import { Module } from "@nestjs/common";
import { StripeModule } from "@/infrastructure/stripe/stripe.module";
import { BalanceModule } from "@/modules/balance/balance.module";
import { PlanModule } from "@/modules/plan/plan.module";
import { StudentModule } from "@/modules/student/student.module";
import { TelegramModule } from "@/modules/telegram/telegram.module";
import { SettingsModule } from "@/modules/settings/settings.module";
import { PaymentsService } from "./application/payments.service";
import { StripeWebhookService } from "./application/stripe-webhook.service";
import { PaymentsInvoiceScheduler } from "./application/payments-invoice.scheduler";
import { CurrencyAuditScheduler } from "./application/currency-audit.scheduler";
import { PaymentsMetrics, paymentsMetricsProviders } from "./application/payments.metrics";
import { PaymentsRepositoryPort } from "./application/ports/payments.repository.port";
import { PaymentsRepository } from "./infrastructure/payments.repository";
import { PaymentsController } from "./interface/payments.controller";
import { PaymentsWebhookController } from "./interface/payments-webhook.controller";
import { LegacyInvoiceController } from "./interface/legacy-invoice.controller";

/**
 * Зависимости строго односторонние: Payments → Telegram и Payments → Balance.
 * Занятия для счёта модуль выбирает собственным репозиторием, а не через LessonModule —
 * иначе получился бы цикл, ведь LessonModule сам зависит от баланса.
 *
 * StudentModule нужен для согласий, собранных на странице оплаты: писать в агрегат ученика
 * должен владеющий им модуль. Цикла нет — StudentModule зависит только от TeacherModule.
 *
 * SettingsModule даёт курс евро для счетов, пересчитанных из BYN. Он не зависит ни от чего,
 * кроме Prisma, поэтому цикла тоже нет.
 */
@Module({
	imports: [StripeModule, BalanceModule, PlanModule, TelegramModule, StudentModule, SettingsModule],
	controllers: [PaymentsController, PaymentsWebhookController, LegacyInvoiceController],
	providers: [
		PaymentsService,
		StripeWebhookService,
		PaymentsInvoiceScheduler,
		CurrencyAuditScheduler,
		PaymentsMetrics,
		...paymentsMetricsProviders,
		{ provide: PaymentsRepositoryPort, useClass: PaymentsRepository },
	],
	exports: [PaymentsService],
})
export class PaymentsModule {}
