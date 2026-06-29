import { calculateAgeFromBirthDate } from '../../../src/shared/utils/calculate-age.util';

describe('calculateAgeFromBirthDate', () => {
	const referenceDate = new Date('2026-06-01');

	it('should return null when birth date is missing', () => {
		expect(calculateAgeFromBirthDate(null, referenceDate)).toBeNull();
		expect(calculateAgeFromBirthDate(undefined, referenceDate)).toBeNull();
	});

	it('should return null for invalid birth date', () => {
		expect(calculateAgeFromBirthDate('invalid-date', referenceDate)).toBeNull();
	});

	it('should calculate age when birthday already happened this year', () => {
		expect(calculateAgeFromBirthDate('2010-01-15', referenceDate)).toBe(16);
	});

	it('should calculate age when birthday has not happened yet this year', () => {
		expect(calculateAgeFromBirthDate('2010-12-15', referenceDate)).toBe(15);
	});

	it('should calculate age on birthday', () => {
		expect(calculateAgeFromBirthDate('2010-06-01', referenceDate)).toBe(16);
	});
});
