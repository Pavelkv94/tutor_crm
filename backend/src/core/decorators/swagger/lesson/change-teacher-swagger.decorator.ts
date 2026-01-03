import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";

export const ChangeTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Change teacher for a lesson",
		}),
		ApiNoContentResponse({
			description: `Teacher changed successfully`,
		}),
		ApiBadRequestResponse({
			description: "Teacher not found or is deleted",
			type: BadRequestErrorResponse,
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
