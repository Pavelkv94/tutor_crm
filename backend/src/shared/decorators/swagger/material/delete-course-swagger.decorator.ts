import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";

export const DeleteCourseSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Delete a course",
		}),
		ApiOkResponse({
			description: "Course has been successfully deleted.",
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Course not found",
		}),
		ApiConflictResponse({
			description: "Course has files and cannot be deleted",
		}),
	];

	return applyDecorators(...decorators);
};
