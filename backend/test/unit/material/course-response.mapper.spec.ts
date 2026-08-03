import { mapCourseToResponse } from '../../../src/modules/material/interface/mappers/course-response.mapper';

describe('mapCourseToResponse', () => {
	it('should map course entity to dto', () => {
		const courseEntity = {
			id: 1,
			name: 'Test Course',
			created_at: new Date('2024-01-01'),
		};

		const result = mapCourseToResponse(courseEntity);

		expect(result).toEqual({
			id: 1,
			name: 'Test Course',
			created_at: courseEntity.created_at,
		});
	});
});
