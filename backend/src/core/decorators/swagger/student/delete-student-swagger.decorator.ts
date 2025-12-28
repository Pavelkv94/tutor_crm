import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiNotFoundResponse, ApiNoContentResponse } from "@nestjs/swagger";

export const DeleteStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Delete a student' }),
		ApiNoContentResponse({ description: 'The student has been successfully deleted.' }),
		ApiBearerAuth(),
		ApiNotFoundResponse({ description: 'Student not found' }),
	];

	return applyDecorators(...decorators);
};
