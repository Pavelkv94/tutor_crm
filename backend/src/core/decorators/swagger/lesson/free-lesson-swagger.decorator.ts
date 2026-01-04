import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";

export const FreeLessonSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Manage free lesson status",
		}),
		ApiNoContentResponse({
			description: `Free lesson status managed successfully`,
		}),
		ApiBadRequestResponse({
			description: "Lesson not found or is deleted",
			type: BadRequestErrorResponse,
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
