import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { UpdateLessonsPlanForPeriodDto } from "@/modules/lesson/interface/dto/requests/update-lesson-plan.input.dto";

export const UpdateLessonsPlanForPeriodSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Update lessons plan for a period",
		}),
		ApiBody({
			description: "Lessons plan update data",
			type: UpdateLessonsPlanForPeriodDto,
		}),
		ApiNoContentResponse({
			description: `Lessons plan updated successfully`,
		}),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Plan not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
