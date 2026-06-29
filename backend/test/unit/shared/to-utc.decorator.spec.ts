import { plainToInstance } from 'class-transformer';
import { ToUTC } from '../../../src/shared/decorators/transform/to-utc.decorator';

class TestDto {
	@ToUTC()
	date: string;
}

describe('ToUTC decorator', () => {
	it('should convert valid ISO string to UTC', () => {
		const result = plainToInstance(TestDto, { date: '2024-06-15T14:30:00+03:00' });

		expect(result.date).toBe('2024-06-15T11:30:00.000Z');
	});

	it('should return value unchanged for non-string input', () => {
		const result = plainToInstance(TestDto, { date: 12345 as any });

		expect(result.date).toBe(12345);
	});

	it('should return value unchanged for null', () => {
		const result = plainToInstance(TestDto, { date: null as any });

		expect(result.date).toBeNull();
	});

	it('should return value unchanged for invalid date string', () => {
		const result = plainToInstance(TestDto, { date: 'not-a-date' });

		expect(result.date).toBe('not-a-date');
	});
});
