import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const RevokeCourseAccessSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Revoke teachers access to a course together with per-material grants and restrictions of that course",
		}),
		ApiNoContentResponse({
			description: "Access has been successfully revoked from all course materials",
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
