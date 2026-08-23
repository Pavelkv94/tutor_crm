/** Кому отправить сформированный счёт. В одном запросе можно указать несколько адресатов. */
export enum SalaryInvoiceDeliveryEnum {
	TELEGRAM_ADMIN = "TELEGRAM_ADMIN",
	TELEGRAM_TEACHER = "TELEGRAM_TEACHER",
}
