import { Dayjs } from "dayjs";


// Функция для группировки дней по неделям
export const getDaysInWeeks = (selectedPeriod: Dayjs, daysInMonth: number) => {
	const firstDayOfMonth = selectedPeriod?.startOf('month');
	const dayOfWeek = firstDayOfMonth.day(); // 0 (вс) ... 6 (сб)
	const startOfWeek = firstDayOfMonth.subtract((dayOfWeek + 6) % 7, 'day'); // понедельник
	const weeks = [];

	let currentWeekStart = startOfWeek;

	while (currentWeekStart?.month() <= firstDayOfMonth?.month() ||
		currentWeekStart?.date() <= daysInMonth) {

		const weekDays = [];
		for (let i = 0; i < 7; i++) {
			const currentDay = currentWeekStart?.add(i, 'day');
			if (currentDay?.month() === firstDayOfMonth?.month()) {
				weekDays.push(currentDay.date());
			} else {
				weekDays.push(null); // Пустая ячейка для дней не из текущего месяца
			}
		}

		weeks.push(weekDays);
		currentWeekStart = currentWeekStart?.add(1, 'week');

		// Прерываем если все дни месяца уже включены
		if (weekDays.every(day => day === null || day <= daysInMonth)) {
			const hasCurrentMonthDays = weekDays.some(day => day !== null);
			if (!hasCurrentMonthDays) break;

			const maxDay = Math.max(...weekDays.filter(day => day !== null));
			if (maxDay >= daysInMonth) break;
		}
	}

	return weeks;
};