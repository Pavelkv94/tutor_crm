import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiResponse, ApiTooManyRequestsResponse } from "@nestjs/swagger";
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
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
