import { configValidationUtility } from '../../../src/shared/utils/env-validation.utility';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';

enum TestEnum {
	VALUE_A = 'A',
	VALUE_B = 'B',
}

class ValidConfig {
	@IsString()
	@IsNotEmpty()
	name: string;
}

describe('configValidationUtility', () => {
	describe('convertToBoolean', () => {
		it('should return true for truthy values', () => {
			expect(configValidationUtility.convertToBoolean('true')).toBe(true);
			expect(configValidationUtility.convertToBoolean('1')).toBe(true);
			expect(configValidationUtility.convertToBoolean('enabled')).toBe(true);
		});

		it('should return false for falsy values', () => {
			expect(configValidationUtility.convertToBoolean('false')).toBe(false);
			expect(configValidationUtility.convertToBoolean('0')).toBe(false);
			expect(configValidationUtility.convertToBoolean('disabled')).toBe(false);
		});

		it('should return null for unknown values', () => {
			expect(configValidationUtility.convertToBoolean('maybe')).toBeNull();
			expect(configValidationUtility.convertToBoolean('')).toBeNull();
		});
	});

	describe('getEnumValues', () => {
		it('should return enum values', () => {
			expect(configValidationUtility.getEnumValues(TestEnum)).toEqual(['A', 'B']);
		});
	});

	describe('validateConfig', () => {
		it('should pass for valid config', () => {
			const config = new ValidConfig();
			config.name = 'test';

			expect(() => configValidationUtility.validateConfig(config)).not.toThrow();
		});

		it('should throw for invalid config', () => {
			const config = new ValidConfig();
			config.name = '';

			expect(() => configValidationUtility.validateConfig(config)).toThrow('Validation failed');
		});
	});
});
