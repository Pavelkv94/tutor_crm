import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { CourseAccessTeacherDto } from "@/modules/material/interface/dto/responses/course-access.dto";

export const GetCourseAccessSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get teachers who have access to the whole course",
		}),
		ApiOkResponse({
			description: "List of teachers with course-level access",
			type: [CourseAccessTeacherDto],
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Course not found",
		}),
	];

	return applyDecorators(...decorators);
};
