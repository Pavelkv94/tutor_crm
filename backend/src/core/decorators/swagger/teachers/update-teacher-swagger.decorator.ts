import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";

export const UpdateTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Update a teacher",
		}),
		ApiResponse({
			status: HttpStatus.NO_CONTENT,
			description: "Teacher has been successfully updated.",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Teacher not found",
		}),
	];

	return applyDecorators(...decorators);
};
