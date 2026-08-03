import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { CourseDto } from "@/modules/material/interface/dto/responses/course.dto";

export const GetCoursesSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all courses",
		}),
		ApiOkResponse({
			description: `Courses have been successfully retrieved`,
			type: [CourseDto],
		}),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
