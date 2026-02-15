import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { LessonOutputDto } from "src/modules/lesson/dto/lesson.output.dto";
import { UpdateLessonsPlanForPeriodDto } from "src/modules/lesson/dto/update-lesson-plan.input.dto";

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
