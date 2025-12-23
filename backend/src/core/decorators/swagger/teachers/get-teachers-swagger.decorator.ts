import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiResponse, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { TeacherOutputDto } from "src/modules/teacher/dto/teacher.output.dto";

export const GetTeachersSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all teachers",
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: "Teachers have been successfully retrieved.",
			type: [TeacherOutputDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
