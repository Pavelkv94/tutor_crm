export const convertToHmToUTC = (date: Date) => {
	const utcDate = new Date(date);
	const localTime = utcDate.toLocaleTimeString("ru-BY", {
		timeZone: "Europe/Minsk",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	return localTime;
}