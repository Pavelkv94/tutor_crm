import { translateError } from '../../../src/shared/utils/error-translations';

describe('translateError', () => {
	it('should translate known error message', () => {
		expect(translateError('Plan not found')).toBe('План не найден');
	});

	it('should return original message for unknown key', () => {
		expect(translateError('Some unknown error')).toBe('Some unknown error');
	});

	it('should translate array of messages', () => {
		const result = translateError(['Plan not found', 'Unknown error']);

		expect(result).toEqual(['План не найден', 'Unknown error']);
	});

	it('should translate all known messages in array', () => {
		const result = translateError(['Teacher not found', 'Student not found']);

		expect(result).toEqual(['Преподаватель не найден', 'Студент не найден']);
	});
});
