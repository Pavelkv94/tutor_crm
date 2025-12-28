import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiBadRequestResponse, ApiNotFoundResponse, ApiNoContentResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";

export const UpdateStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Update a student' }),
		ApiNoContentResponse({ description: 'The student has been successfully updated.' }),
		ApiBearerAuth(),
		ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorResponse }),
		ApiNotFoundResponse({ description: 'Student not found' }),
	];

	return applyDecorators(...decorators);
};
