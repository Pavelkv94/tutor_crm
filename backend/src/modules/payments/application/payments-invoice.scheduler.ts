import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PaymentsService } from "@/modules/payments/application/payments.service";

@Injectable()
export class PaymentsInvoiceScheduler {
	private readonly logger = new Logger(PaymentsInvoiceScheduler.name);

	constructor(private readonly paymentsService: PaymentsService) {}

	/**
	 * 1-го числа в 10:00. Часовой пояс задан явно: без него cron берёт время сервера,
	 * а в контейнере это UTC — счета уходили бы на три часа раньше ожидаемого админом.
	 */
	@Cron("0 10 1 * *", { timeZone: "Europe/Minsk" })
	async issueMonthlyInvoices(): Promise<void> {
		try {
			await this.paymentsService.issueMonthlyInvoices(new Date());
		} catch (error) {
			this.logger.error(`Ежемесячное выставление счетов упало: ${(error as Error).message}`);
		}
	}
}
