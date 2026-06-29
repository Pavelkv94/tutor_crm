import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse } from "@nestjs/swagger";

export const DeleteTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Delete a teacher",
		}),
		ApiResponse({
			status: HttpStatus.NO_CONTENT,
			description: "Teacher has been successfully deleted.",
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Teacher not found",
		}),
	];

	return applyDecorators(...decorators);
};
