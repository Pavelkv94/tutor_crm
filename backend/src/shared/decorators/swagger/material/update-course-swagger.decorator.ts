import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { CourseDto } from "@/modules/material/interface/dto/responses/course.dto";

export const UpdateCourseSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Update a course",
		}),
		ApiOkResponse({
			description: "Course has been successfully updated.",
			type: CourseDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Course not found",
		}),
	];

	return applyDecorators(...decorators);
};
