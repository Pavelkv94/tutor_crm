import type { Dayjs } from "dayjs";

export const convertToUTC0 = (period: Dayjs, day: number, hourUTC3: string) => {
	const year = period.year();
	const month = period.month();
	const hour = Number(hourUTC3.split(":")[0]);
	const minute = Number(hourUTC3.split(":")[1]);
	const date = new Date(Date.UTC(year, month, day, hour - 3, minute)); // приводим к UTC+0
	const utcString = date.toISOString();


	return utcString;
}

export const convertCurrentDateToUTCBelarus = (hour: number) => {
	const now = new Date();

	now.setUTCHours(hour, 0, 0, 0);

	const localTime = now.toLocaleTimeString("ru-BY", {
		timeZone: "Europe/Minsk",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	return localTime;
}

export const convertCurrentDateToUTCPoland = (hour: number) => {
	const now = new Date();

	now.setUTCHours(hour, 0, 0, 0);

	const localTime = now.toLocaleTimeString("pl-PL", {
		timeZone: "Europe/Warsaw",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	return localTime;
};

export const convertDateToUTCBelarus = (date: Date): string => {
	// Получаем компоненты времени в Europe/Minsk
	const formatter = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Europe/Minsk",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const parts = formatter.formatToParts(date);
	const get = (type: string) => parts.find(p => p.type === type)?.value;

	// Собираем локальную дату в Europe/Minsk
	const localDate = new Date(
		`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
	);

	// Возвращаем как UTC ISO строку
	return localDate.toISOString(); // например, "2025-09-04T11:00:00.000Z"
};

export const convertDateFromBelarusToUTC0 = (date: Dayjs): string => {
	// Получаем компоненты как будто это локальное время в Минске
	const year = date.year();
	const month = date.month(); // 0-based
	const day = date.date();
	const hour = date.hour();
	const minute = date.minute();
	const second = date.second();

	// Создаём дату как будто она в Europe/Minsk
	const belarusOffset = 3; // UTC+3
	const utcDate = new Date(Date.UTC(year, month, day, hour - belarusOffset, minute, second));

	return utcDate.toISOString(); // например, "2025-09-04T08:00:00.000Z"
};


export const formatDateEuropeMinsk = (input: string | Date): string => {
	const date = new Date(input);

	const formatter = new Intl.DateTimeFormat("ru-BY", {
		timeZone: "Europe/Minsk",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	// Вернёт строку вида "01.10.2025, 12:00"
	const formatted = formatter.format(date);

	// Удалим запятую, если она есть
	return formatted.replace(",", "").trim(); // → "01.10.2025 12:00"
};
