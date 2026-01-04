import * as ExcelJS from 'exceljs';
import { StudentOutputDto } from '../student/dto/student.output.dto';

interface DateParts {
	year: number;
	month: number;
	day: number;
}

export const buildStudentsExcel = (
	students: StudentOutputDto[],
	teacherName: string
): ExcelJS.Workbook => {
	// Create a new workbook
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet('Ученики');

	// Convert UTC+0 date to UTC+3 and get parts
	const getUTC3DateParts = (utcDate: Date): DateParts => {
		const date = new Date(utcDate);
		const utcYear = date.getUTCFullYear();
		const utcMonth = date.getUTCMonth();
		const utcDay = date.getUTCDate();

		return {
			year: utcYear,
			month: utcMonth,
			day: utcDay,
		};
	};

	// Format date as "1 января 2026"
	const formatDate = (date: Date): string => {
		const parts = getUTC3DateParts(date);
		const monthNames = [
			'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
			'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
		];
		return `${parts.day} ${monthNames[parts.month]} ${parts.year}`;
	};

	// Sort students by name
	const sortedStudents = [...students].sort((a, b) => {
		if (a.deleted_at && !b.deleted_at) return 1;
		if (!a.deleted_at && b.deleted_at) return -1;
		return a.name.localeCompare(b.name);
	});

	// Add header row with teacher info
	const infoRow = worksheet.addRow([]);
	const teacherText = `Преподаватель: ${teacherName}`;
	infoRow.getCell(1).value = teacherText;
	infoRow.getCell(1).font = { bold: true, size: 11 };
	infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
	worksheet.mergeCells(1, 1, 1, 5);
	infoRow.height = 25;

	// Add empty row
	worksheet.addRow([]);

	// Add table headers
	const headerRow = worksheet.addRow([
		'ID',
		'Имя',
		'Класс',
		'Дата рождения',
		'Дата удаления',
	]);

	// Style header row
	headerRow.font = { bold: true, size: 10 };
	headerRow.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FFE0E0E0' },
	};
	headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
	headerRow.height = 20;

	// Style header cells
	headerRow.eachCell((cell) => {
		cell.border = {
			top: { style: 'thin', color: { argb: 'FF000000' } },
			left: { style: 'thin', color: { argb: 'FF000000' } },
			bottom: { style: 'thin', color: { argb: 'FF000000' } },
			right: { style: 'thin', color: { argb: 'FF000000' } },
		};
	});

	// Add data rows
	sortedStudents.forEach((student) => {
		const dataRow = worksheet.addRow([
			student.id,
			student.name,
			student.class,
			student.birth_date ? formatDate(student.birth_date) : '',
			student.deleted_at ? formatDate(student.deleted_at) : '',
		]);

		// Style data row
		dataRow.alignment = { vertical: 'middle', horizontal: 'left' };
		dataRow.height = 18;

		// Style data cells
		dataRow.eachCell((cell, colNumber) => {
			cell.border = {
				top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
				right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
			};
			cell.font = { size: 9 };

			// Center align for ID and class columns
			if (colNumber === 1 || colNumber === 3) {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			}

			// Gray out deleted students
			if (student.deleted_at && colNumber !== 5) {
				cell.font = { ...cell.font, color: { argb: 'FF999999' } };
			}
		});
	});

	// Set column widths
	worksheet.getColumn(1).width = 8; // ID
	worksheet.getColumn(2).width = 30; // Name
	worksheet.getColumn(3).width = 10; // Class
	worksheet.getColumn(4).width = 18; // Birth date
	worksheet.getColumn(5).width = 18; // Deleted at

	// Freeze header row
	worksheet.views = [
		{
			state: 'frozen',
			ySplit: 3, // Freeze first 3 rows (info + empty + header)
		},
	];

	return workbook;
};

