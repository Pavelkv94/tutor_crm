/**
 * Translation map for error messages from English to Russian
 */
export const errorTranslations: Record<string, string> = {
	// Common errors
	'Plan not found': 'План не найден',
	'Plan already deleted': 'План уже удален',
	'Student not found': 'Студент не найден',
	'Student already deleted': 'Студент уже удален',
	'Teacher not found': 'Преподаватель не найден',
	'Teacher is deleted': 'Преподаватель удален',
	'Teacher already deleted': 'Преподаватель уже удален',
	'Teacher already exists': 'Преподаватель уже существует',
	'Lesson not found': 'Урок не найден',
	'Lesson already cancelled': 'Урок уже отменен',
	'User not authenticated': 'Пользователь не аутентифицирован',
	'Access denied. Admin role required.': 'Доступ запрещен. Требуется роль администратора.',
	'Invalid token payload': 'Неверная полезная нагрузка токена',
	'Invalid credentials': 'Неверные учетные данные',
	'User not found': 'Пользователь не найден',
	'Invalid password': 'Неверный пароль',
	'Admin already exists': 'Администратор уже существует',
	'Internal server error': 'Внутренняя ошибка сервера',
	'You are not allowed to cancel this lesson': 'Вы не можете отменить этот урок',
};

/**
 * Translates error message(s) to Russian
 * @param message - Single message string or array of message strings
 * @returns Translated message(s)
 */
export const translateError = (message: string | string[]): string | string[] => {
	if (Array.isArray(message)) {
		return message.map(msg => errorTranslations[msg] || msg);
	}
	return errorTranslations[message] || message;
};

