import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { TeacherOutputDto } from "src/modules/teacher/dto/teacher.output.dto";

export const CreateTeacherSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a new teacher",
		}),
		ApiResponse({
			status: HttpStatus.CREATED,
			description: "Teacher has been successfully created.",
			type: [TeacherOutputDto],
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
