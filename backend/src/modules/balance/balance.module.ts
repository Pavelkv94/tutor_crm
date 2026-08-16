import { Module } from "@nestjs/common";
import { BalanceService } from "./application/balance.service";
import { BalanceRepositoryPort } from "./application/ports/balance.repository.port";
import { BalanceRepository } from "./infrastructure/balance.repository";

/**
 * Ядро баланса вынесено в отдельный модуль намеренно: от него зависят и LessonModule
 * (откаты аллокаций при отмене/переносе занятий), и PaymentsModule (зачисление оплат).
 * Держи он всё это в PaymentsModule — получился бы цикл Lesson ↔ Payments.
 * Модуль — лист графа: кроме глобального PrismaModule ни от чего не зависит.
 */
@Module({
	providers: [BalanceService, { provide: BalanceRepositoryPort, useClass: BalanceRepository }],
	exports: [BalanceService, BalanceRepositoryPort],
})
export class BalanceModule {}
