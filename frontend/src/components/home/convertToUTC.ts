import type { Dayjs } from "dayjs";

export const convertToUTC = (period: Dayjs, day: number, hourUTC3: string) => {
	const year = period.year();
	const month = period.month();
	const hour = Number(hourUTC3.split(":")[0]);
	const minute = Number(hourUTC3.split(":")[1]);
	const date = new Date(Date.UTC(year, month, day, hour - 3, minute)); // приводим к UTC+0
	const utcString = date.toISOString();


	return utcString;
}