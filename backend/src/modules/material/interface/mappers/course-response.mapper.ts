import { CourseEntity } from "../../domain/course.entity";
import { CourseDto } from "../dto/responses/course.dto";

export function mapCourseToResponse(course: CourseEntity): CourseDto {
	return {
		id: course.id,
		name: course.name,
		created_at: course.created_at,
	};
}
