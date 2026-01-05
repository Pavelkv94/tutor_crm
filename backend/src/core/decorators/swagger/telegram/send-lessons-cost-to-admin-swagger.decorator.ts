import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";

export const SendLessonsCostToAdminSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Send lessons cost to admin",
		}),
		ApiNoContentResponse({
			description: "Lessons cost has been successfully sent to admin.",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
	];

	return applyDecorators(...decorators);
};
