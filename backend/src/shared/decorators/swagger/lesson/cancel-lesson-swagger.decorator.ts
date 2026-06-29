import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const CancelLessonSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Cancel a lesson",
		}),
		ApiNoContentResponse({
			description: `Lesson cancelled successfully`,
		}),
		ApiBadRequestResponse({
			description: "Lesson not found or is cancelled",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Lesson not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
