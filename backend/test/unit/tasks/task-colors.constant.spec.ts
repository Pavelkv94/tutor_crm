import { TASK_COLORS, pickTaskColor } from '../../../src/modules/tasks/constants/task-colors.constant';

describe('pickTaskColor', () => {
	it('should return first color for count 0', () => {
		expect(pickTaskColor(0)).toBe('bg-yellow-200');
	});

	it('should return second color for count 1', () => {
		expect(pickTaskColor(1)).toBe('bg-pink-200');
	});

	it('should cycle back to first color after all colors are used', () => {
		expect(pickTaskColor(TASK_COLORS.length)).toBe(TASK_COLORS[0]);
	});

	it('should cycle correctly for any multiple of colors length', () => {
		for (let i = 0; i < TASK_COLORS.length; i++) {
			expect(pickTaskColor(i)).toBe(TASK_COLORS[i]);
			expect(pickTaskColor(i + TASK_COLORS.length)).toBe(TASK_COLORS[i]);
		}
	});

	it('should return a color from TASK_COLORS for any non-negative count', () => {
		for (let i = 0; i < 20; i++) {
			expect(TASK_COLORS).toContain(pickTaskColor(i));
		}
	});
});
