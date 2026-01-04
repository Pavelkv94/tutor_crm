import * as ExcelJS from 'exceljs';
import { LessonOutputDto } from '../lesson/dto/lesson.output.dto';
import { LessonStatusEnum } from '../lesson/dto/lesson-status.enum';

interface DateParts {
	year: number;
	month: number;
	day: number;
	hours: number;
	minutes: number;
}

export const buildScheduleExcel = (
	lessons: LessonOutputDto[],
	startDate: string,
	endDate: string,
	teacherName: string
): ExcelJS.Workbook => {
	// Create a new workbook
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Расписание');

	// Convert UTC+0 date to UTC+3 and get parts
	const getUTC3DateParts = (utcDate: Date): DateParts => {
		const date = new Date(utcDate);
		const utcYear = date.getUTCFullYear();
		const utcMonth = date.getUTCMonth();
		const utcDay = date.getUTCDate();
		let utcHours = date.getUTCHours();
		const utcMinutes = date.getUTCMinutes();

		// Add 3 hours for UTC+3
		utcHours += 3;

		// Handle day overflow
		let day = utcDay;
		let hours = utcHours;
		if (hours >= 24) {
			hours -= 24;
			day += 1;
		}

		return {
			year: utcYear,
			month: utcMonth,
			day,
			hours,
			minutes: utcMinutes,
		};
	};

	// Format lesson text: [HH:MM] Name Class Duration
	const formatLessonText = (lesson: LessonOutputDto): string => {
		const { hours, minutes } = getUTC3DateParts(lesson.date);
		const hoursStr = hours.toString().padStart(2, '0');
		const minutesStr = minutes.toString().padStart(2, '0');
		return `[${hoursStr}:${minutesStr}] ${lesson.student.name} ${lesson.student.class}кл ${lesson.plan.duration} мин`;
	};

	// Get background color for lesson status
	const getLessonStatusColor = (status: LessonStatusEnum): string => {
		switch (status) {
			case LessonStatusEnum.PENDING_PAID:
				return 'FFBFF7B7'; // Light green
			case LessonStatusEnum.PENDING_UNPAID:
				return 'FFFFFFFF'; // White
			case LessonStatusEnum.COMPLETED_PAID:
				return 'FF3FC12D'; // Green
			case LessonStatusEnum.COMPLETED_UNPAID:
				return 'FF6DA5F7'; // Blue
			case LessonStatusEnum.MISSED:
				return 'FFEAFF2E'; // Yellow
			case LessonStatusEnum.RESCHEDULED:
				return 'FFFD9500'; // Orange
			case LessonStatusEnum.CANCELLED:
				return 'FFFD0000'; // Red
			default:
				return 'FFFFFFFF'; // White
		}
	};

	// Parse the requested month from startDate
	const startDateObj = new Date(startDate);
	const requestedYear = startDateObj.getFullYear();
	const requestedMonth = startDateObj.getMonth(); // 0-based (0 = January)
	
	// Generate all days in the date range
	const start = new Date(startDate);
	const end = new Date(endDate);
	const days: Date[] = [];
	const currentDate = new Date(start);
	
	while (currentDate <= end) {
		days.push(new Date(currentDate));
		currentDate.setDate(currentDate.getDate() + 1);
	}
	
	// Helper to check if a day belongs to the requested month
	const isInRequestedMonth = (date: Date): boolean => {
		const parts = getUTC3DateParts(date);
		return parts.year === requestedYear && parts.month === requestedMonth;
	};

	// Generate time slots from 7:00 to 22:00 (hourly)
	const timeSlots: number[] = [];
	for (let hour = 7; hour <= 22; hour++) {
		timeSlots.push(hour);
	}

	// Helper function to normalize date to UTC+3 date string (YYYY-MM-DD)
	const getDateKey = (date: Date): string => {
		const parts = getUTC3DateParts(date);
		return `${parts.year}-${(parts.month + 1).toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
	};

	// Create a map: day-hour -> lessons[]
	const lessonsMap = new Map<string, LessonOutputDto[]>();
	lessons.forEach((lesson) => {
		const { day, hours, minutes } = getUTC3DateParts(lesson.date);
		const lessonDateKey = getDateKey(lesson.date);
		
		// Round down to nearest hour for grid placement (e.g., 11:30 -> 11:00 row)
		const hourSlot = hours;
		
		// Find matching day index
		const dayIndex = days.findIndex((d) => {
			const dayDateKey = getDateKey(d);
			return dayDateKey === lessonDateKey;
		});
		
		if (dayIndex !== -1) {
			const key = `${dayIndex}-${hourSlot}`;
			if (!lessonsMap.has(key)) {
				lessonsMap.set(key, []);
			}
			lessonsMap.get(key)!.push(lesson);
		}
	});
	
	// Sort lessons within each cell by time
	lessonsMap.forEach((cellLessons) => {
		cellLessons.sort((a, b) => {
			const aParts = getUTC3DateParts(a.date);
			const bParts = getUTC3DateParts(b.date);
			const aTime = aParts.hours * 60 + aParts.minutes;
			const bTime = bParts.hours * 60 + bParts.minutes;
			return aTime - bTime;
		});
	});

	// Group days into weeks according to real calendar (Monday-Sunday)
	// Always start weeks on Monday, adding empty days before/after if needed
	const weeks: (Date | null)[][] = [];
	
	if (days.length === 0) {
		return workbook; // No days to process
	}
	
	// Get the first day and determine what day of week it is
	const firstDay = days[0];
	const firstDayParts = getUTC3DateParts(firstDay);
	const firstDateObj = new Date(Date.UTC(firstDayParts.year, firstDayParts.month, firstDayParts.day));
	const firstDayOfWeek = firstDateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday=0, Sunday=6
	
	// Get the last day and determine what day of week it is
	const lastDay = days[days.length - 1];
	const lastDayParts = getUTC3DateParts(lastDay);
	const lastDateObj = new Date(Date.UTC(lastDayParts.year, lastDayParts.month, lastDayParts.day));
	const lastDayOfWeek = lastDateObj.getUTCDay();
	const mondayBasedLastDay = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
	
	let dayIndex = 0;
	
	// Process weeks
	while (dayIndex < days.length) {
		const currentWeek: (Date | null)[] = [];
		
		// If this is the first week and it doesn't start on Monday, add nulls for empty days
		if (weeks.length === 0 && mondayBasedFirstDay > 0) {
			for (let i = 0; i < mondayBasedFirstDay; i++) {
				currentWeek.push(null); // Empty day before the requested period
			}
		}
		
		// Add days for the current week (up to Sunday)
		while (currentWeek.length < 7 && dayIndex < days.length) {
			currentWeek.push(days[dayIndex]);
			dayIndex++;
			
			// Check if we've reached Sunday (mondayBasedDay = 6)
			if (currentWeek.length > 0 && currentWeek[currentWeek.length - 1] !== null) {
				const lastAddedDay = currentWeek[currentWeek.length - 1]!;
				const lastAddedParts = getUTC3DateParts(lastAddedDay);
				const lastAddedDateObj = new Date(Date.UTC(lastAddedParts.year, lastAddedParts.month, lastAddedParts.day));
				const lastAddedDayOfWeek = lastAddedDateObj.getUTCDay();
				const mondayBasedLastAdded = lastAddedDayOfWeek === 0 ? 6 : lastAddedDayOfWeek - 1;
				
				// If we've reached Sunday, this week is complete
				if (mondayBasedLastAdded === 6) {
					break;
				}
			}
		}
		
		// If this is the last week and it doesn't end on Sunday, add nulls for empty days
		if (dayIndex >= days.length && currentWeek.length < 7) {
			while (currentWeek.length < 7) {
				currentWeek.push(null); // Empty day after the requested period
			}
		}
		
		weeks.push(currentWeek);
	}

	// Set column widths (wider for lesson cells)
	worksheet.getColumn(1).width = 8; // Time column
	// Set width for up to 7 day columns (wider)
	for (let i = 0; i < 7; i++) {
		worksheet.getColumn(i + 2).width = 26;
	}

	// Format dates for display
	const formatDateForDisplay = (dateStr: string): string => {
		const date = new Date(dateStr);
		const parts = getUTC3DateParts(date);
		const monthNames = [
			'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
			'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
		];
		return `${parts.day} ${monthNames[parts.month]} ${parts.year}`;
	};

	// Weekday names in Russian
	const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

	let currentRow = 1;

	// Add period and teacher info row at the top
	const maxColsForInfo = 8; // Always 7 days + 1 time column
	const infoRow = worksheet.addRow([]);
	const periodText = `Период: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
	const teacherText = `Преподаватель: ${teacherName}`;
	infoRow.getCell(1).value = `${periodText} | ${teacherText}`;
	infoRow.getCell(1).font = { bold: true, size: 10 };
	infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
	worksheet.mergeCells(1, 1, 1, maxColsForInfo);
	infoRow.height = 20;
	currentRow++;

	const firstHeaderRow = currentRow;
	let lastDataRow = 0;

	// Process each week as a separate block
	weeks.forEach((weekDays, weekIndex) => {
		// Add spacing row before each week (except the first)
		if (weekIndex > 0) {
			worksheet.addRow([]);
			currentRow++;
		}

		// Create weekday names row (always Monday-Sunday)
		const weekdayRow = worksheet.addRow([
			'',
			...weekDays.map((d, index) => {
				if (d === null) {
					// Empty day - still show weekday name based on position (Monday=0, Sunday=6)
					return weekdayNames[index];
				}
				const parts = getUTC3DateParts(d);
				const dateObj = new Date(Date.UTC(parts.year, parts.month, parts.day));
				const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
				const mondayBasedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
				return weekdayNames[mondayBasedDayOfWeek];
			}),
		]);

		weekdayRow.font = { bold: true, size: 9 };
		weekdayRow.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFFEF9C3' }, // RGB(254, 249, 195)
		};
		weekdayRow.alignment = { vertical: 'middle', horizontal: 'center' };
		weekdayRow.height = 15;

		// Style weekday row cells
		weekdayRow.eachCell((cell, colNumber) => {
			// Apply the same background color to all cells including time column
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFEF9C3' }, // RGB(254, 249, 195)
			};
			cell.border = {
				top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
			};
		});

		currentRow++;

		// Create header row for this week (day numbers)
		const headerRow = worksheet.addRow([
			'Время',
			...weekDays.map((d) => {
				if (d === null) {
					return ''; // Empty day - no day number
				}
				const parts = getUTC3DateParts(d);
				return parts.day.toString();
			}),
		]);

		headerRow.font = { bold: true, size: 9 };
		headerRow.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFE0E0E0' },
		};
		headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
		headerRow.height = 15;

		// Style header cells
		headerRow.eachCell((cell, colNumber) => {
			if (colNumber === 1) {
				// Time header
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FFE0E0E0' },
				};
			} else {
				// Day header - check if it's an empty day
				const dayIndex = colNumber - 2;
				const day = dayIndex < weekDays.length ? weekDays[dayIndex] : null;
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: day === null ? 'FFD0D0D0' : 'FFE0E0E0' }, // Darker gray for empty days
				};
			}
			// Add thin borders to header cells (thick borders will be added later)
			cell.border = {
				top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
			};
		});

		currentRow++;

		// Find max lessons in any cell for this week to determine row height
		let maxLessonsInWeek = 1;
		timeSlots.forEach((hour) => {
			weekDays.forEach((day) => {
				if (day === null) return; // Skip empty days
				const globalDayIndex = days.findIndex((d) => {
					const dayKey = getDateKey(d);
					const weekDayKey = getDateKey(day);
					return dayKey === weekDayKey;
				});
				if (globalDayIndex !== -1) {
					const key = `${globalDayIndex}-${hour}`;
					const cellLessons = lessonsMap.get(key) || [];
					if (cellLessons.length > maxLessonsInWeek) {
						maxLessonsInWeek = cellLessons.length;
					}
				}
			});
		});

		// Create rows for each time slot for this week
		timeSlots.forEach((hour) => {
			const rowData: (string | undefined)[] = [
				`${hour.toString().padStart(2, '0')}:00`,
			];
			
			let maxLessonsInRow = 1;

			weekDays.forEach((day, dayIndexInWeek) => {
				if (day === null) {
					// Empty day - add empty cell
					rowData.push('');
				} else {
					// Find the global day index
					const globalDayIndex = days.findIndex((d) => {
						const dayKey = getDateKey(d);
						const weekDayKey = getDateKey(day);
						return dayKey === weekDayKey;
					});

					if (globalDayIndex !== -1) {
						const key = `${globalDayIndex}-${hour}`;
						const cellLessons = lessonsMap.get(key) || [];
						
						if (cellLessons.length > maxLessonsInRow) {
							maxLessonsInRow = cellLessons.length;
						}

						if (cellLessons.length > 0) {
							// Combine multiple lessons with newlines
							const lessonTexts = cellLessons.map(formatLessonText);
							rowData.push(lessonTexts.join('\n'));
						} else {
							rowData.push('');
						}
					} else {
						rowData.push('');
					}
				}
			});

			const row = worksheet.addRow(rowData);
			// Adjust row height based on number of lessons (base 18 + 12 per additional lesson)
			row.height = 18 + (maxLessonsInRow - 1) * 12;

			// Style time column
			const timeCell = row.getCell(1);
			timeCell.font = { bold: true, size: 8 };
			timeCell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFF0F0F0' },
			};
			timeCell.alignment = {
				vertical: 'middle',
				horizontal: 'center',
			};
			
			// Add thin borders to time column (thick borders will be added later)
			timeCell.border = {
				top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
			};

			// Style day columns and apply colors
			weekDays.forEach((day, dayIndexInWeek) => {
				const cell = row.getCell(dayIndexInWeek + 2);
				
				if (day === null) {
					// Empty day - gray background, no data
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FFE5E5E5' }, // Gray for empty days
					};
					cell.border = {
						top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
						left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
						bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
						right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
					};
					return; // Skip rest of styling for empty days
				}
				
				// Find the global day index
				const globalDayIndex = days.findIndex((d) => {
					const dayKey = getDateKey(d);
					const weekDayKey = getDateKey(day);
					return dayKey === weekDayKey;
				});

				const key = globalDayIndex !== -1 ? `${globalDayIndex}-${hour}` : '';
				const cellLessons = globalDayIndex !== -1 ? (lessonsMap.get(key) || []) : [];

				cell.alignment = {
					vertical: 'top',
					horizontal: 'left',
					wrapText: true,
				};
				// Add thin borders (thick borders will be added later around entire schedule)
				cell.border = {
					top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
					left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
					bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
					right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				};

				// Apply background color based on lesson status
				if (cellLessons.length > 0) {
					// Use the first lesson's status for color (or combine if multiple)
					const primaryStatus = cellLessons[0].status;
					const hasCancelled = cellLessons.some(
						(l) => l.status === LessonStatusEnum.CANCELLED
					);

					// If any lesson is cancelled, use red background
					const color = hasCancelled
						? 'FFFD0000'
						: getLessonStatusColor(primaryStatus);

					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: color },
					};

					cell.font = { size: 8 };
				} else {
					// Empty cell - white background
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FFFFFFFF' },
					};
				}

				// Special styling for 13:00 (lunch break)
				if (hour === 13) {
					if (cellLessons.length === 0) {
						cell.fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF88F1EC' }, // Light cyan
						};
					}
				}
			});

			currentRow++;
		});
		lastDataRow = currentRow - 1;
	});

	// Freeze first row and first column
	worksheet.views = [
		{
			state: 'frozen',
			xSplit: 1,
			ySplit: 1,
		},
	];

	return workbook;
};

