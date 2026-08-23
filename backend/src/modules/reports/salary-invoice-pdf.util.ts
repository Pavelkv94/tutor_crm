import * as Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { SALARY_INVOICE_TEMPLATE } from "@/modules/reports/salary-invoice.template";

export type SalaryInvoiceLineView = {
	index: number;
	description_pl: string;
	description_ru: string;
	period: string;
	/** Уже отформатированная сумма, например "752,00". */
	amount: string;
};

export type SalaryInvoiceView = {
	invoice_number: string;
	invoice_date: string;
	issuer: {
		full_name: string;
		address: string;
		passport: string;
		email: string;
	};
	buyer: {
		name: string;
		nip: string;
		address: string;
		email: string;
	};
	lines: SalaryInvoiceLineView[];
	currency: string;
	total: string;
	payment: {
		recipient: string;
		bank_name: string;
		bank_account: string;
		term: string;
	};
	labels: {
		vat_pl: string;
		vat_ru: string;
		signature_pl: string;
		signature_ru: string;
	};
};

// Шаблон компилируется один раз на процесс: разметка статична, меняются только данные.
const renderInvoiceHtml = Handlebars.compile<SalaryInvoiceView>(SALARY_INVOICE_TEMPLATE);

/** Формат сумм в бланке — польский/русский: запятая как десятичный разделитель, два знака. */
export const formatInvoiceAmount = (amount: number): string =>
	amount.toFixed(2).replace(".", ",");

/**
 * Даты периода приходят с фронта ISO-строками, собранными по конвенции UTC+3
 * (см. parseUTC3DateForDisplay в SalaryReportDialog). Чтобы в бланке стояла та же дата,
 * которую администратор видел в форме, сдвигаем на +3 часа и читаем UTC-компоненты.
 */
export const toReportDate = (isoString: string): Date =>
	new Date(new Date(isoString).getTime() + 3 * 60 * 60 * 1000);

/** Дата в бланке — DD.MM.YYYY. */
export const formatInvoiceDate = (date: Date): string => {
	const day = String(date.getUTCDate()).padStart(2, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	return `${day}.${month}.${date.getUTCFullYear()}`;
};

/**
 * Имя файла в формате, к которому привык администратор:
 * `2026-07-01_Rachunek_Demukh_Nr-7-2026.pdf`.
 *
 * Фамилия берётся из ФИО латиницей, номер счёта приводится к безопасному для
 * файловой системы виду — «7/2026» превратилось бы в подпапку.
 */
export const buildSalaryInvoiceFileName = (params: {
	invoiceDate: Date;
	fullNameLatin: string;
	invoiceNumber: string;
}): string => {
	const isoDate = params.invoiceDate.toISOString().slice(0, 10);
	const surname =
		params.fullNameLatin.trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9-]/g, "") || "Teacher";
	const invoiceNumber = params.invoiceNumber.trim().replace(/[^A-Za-z0-9]+/g, "-");
	return `${isoDate}_Rachunek_${surname}_Nr-${invoiceNumber}.pdf`;
};

/**
 * Рендерит бланк счёта в PDF.
 *
 * Chromium запускается на время рендера и закрывается: счёт формируется раз в месяц,
 * держать браузер в памяти между запросами незачем. В контейнере используется системный
 * Chromium (PUPPETEER_EXECUTABLE_PATH) — скачанный puppeteer'ом бинарник в alpine не работает.
 */
export const buildSalaryInvoicePdf = async (view: SalaryInvoiceView): Promise<Buffer> => {
	const browser = await puppeteer.launch({
		headless: true,
		executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	try {
		const page = await browser.newPage();
		await page.setContent(renderInvoiceHtml(view), { waitUntil: "load" });
		const pdf = await page.pdf({
			format: "A4",
			printBackground: true,
			margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
		});
		return Buffer.from(pdf);
	} finally {
		await browser.close();
	}
};
