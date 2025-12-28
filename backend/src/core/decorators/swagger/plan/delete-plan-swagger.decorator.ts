import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse } from "@nestjs/swagger";

export const DeletePlanSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Delete a plan",
		}),
		ApiResponse({
			status: HttpStatus.NO_CONTENT,
			description: "Plan has been successfully deleted.",
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Plan not found",
		}),
	];

	return applyDecorators(...decorators);
};
