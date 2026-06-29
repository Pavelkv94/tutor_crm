import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { LessonOutputDto } from "@/modules/lesson/interface/dto/responses/lesson.output.dto";

export const CreateSingleLessonSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a single lesson",
		}),
		ApiCreatedResponse({
			description: `Lesson created successfully`,
			type: LessonOutputDto,
		}),
		ApiBadRequestResponse({
			description: "Lesson already booked for this student at this time",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Plan not found",
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
