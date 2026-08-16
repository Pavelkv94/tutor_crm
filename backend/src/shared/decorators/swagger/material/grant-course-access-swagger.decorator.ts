import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const GrantCourseAccessSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Grant teachers access to a course, including materials added later. Resets per-material restrictions of the course",
		}),
		ApiNoContentResponse({
			description: "Access has been successfully granted to all course materials",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request (e.g. invalid teacher id)",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Course not found",
		}),
	];

	return applyDecorators(...decorators);
};
