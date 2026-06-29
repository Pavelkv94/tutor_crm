import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";

export const CreateTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a new teacher",
		}),
		ApiResponse({
			status: HttpStatus.CREATED,
			description: "Teacher has been successfully created.",
			type: TeacherDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
