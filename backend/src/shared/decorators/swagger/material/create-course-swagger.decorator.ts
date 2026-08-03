import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiBadRequestResponse, ApiCreatedResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { CourseDto } from "@/modules/material/interface/dto/responses/course.dto";

export const CreateCourseSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a new course",
		}),
		ApiCreatedResponse({
			description: `Course created successfully`,
			type: CourseDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
