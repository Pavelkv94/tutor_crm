import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";

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
