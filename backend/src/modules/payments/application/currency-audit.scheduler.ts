import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { endOfMonth, startOfMonth } from "date-fns";
import { BalanceRepositoryPort } from "@/modules/balance/application/ports/balance.repository.port";
import { PaymentsRepositoryPort } from "@/modules/payments/application/ports/payments.repository.port";
import { TelegramService } from "@/modules/telegram/application/telegram.service";

/**
 * Проверки при создании занятия ловят конфликт валют на входе, но не покрывают правки
 * задним числом, восстановление удалённых планов и прямые изменения в БД. Ежесуточный
 * отчёт показывает администратору тех учеников, у кого валюты всё-таки разъехались.
 */
@Injectable()
export class CurrencyAuditScheduler {
	private readonly logger = new Logger(CurrencyAuditScheduler.name);

	constructor(
		private readonly paymentsRepository: PaymentsRepositoryPort,
		private readonly balanceRepository: BalanceRepositoryPort,
		private readonly telegramService: TelegramService,
	) {}

	@Cron("0 7 * * *", { timeZone: "Europe/Minsk" })
	async auditCurrencies(): Promise<void> {
		try {
			const problems = await this.collectProblems();
			if (problems.length === 0) {
				this.logger.log("Аудит валют: расхождений нет");
				return;
			}

			this.logger.warn(`Аудит валют: расхождения у ${problems.length} учеников`);
			await this.telegramService.sendMessageToAdmin(`⚠️ <b>Расхождения по валютам</b>\n\n${problems.join("\n")}`);
		} catch (error) {
			this.logger.error(`Аудит валют упал: ${(error as Error).message}`);
		}
	}

	private async collectProblems(): Promise<string[]> {
		const now = new Date();
		const from = startOfMonth(now);
		const to = endOfMonth(now);
		const students = await this.paymentsRepository.getActiveStudents();
		const problems: string[] = [];

		for (const student of students) {
			const currencies = await this.balanceRepository.getBillableLessonCurrencies(student.id, from, to);

			if (currencies.length > 1) {
				problems.push(`• ${student.name} (id ${student.id}): занятия месяца в разных валютах — ${currencies.join(", ")}`);
				continue;
			}
			if (student.balance !== 0 && student.balance_currency && currencies.length === 1 && currencies[0] !== student.balance_currency) {
				problems.push(`• ${student.name} (id ${student.id}): на балансе ${student.balance} ${student.balance_currency}, а занятия месяца в ${currencies[0]}`);
			}
		}

		return problems;
	}
}
