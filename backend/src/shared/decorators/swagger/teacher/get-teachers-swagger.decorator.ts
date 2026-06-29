import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TeacherDto } from "@/modules/teacher/interface/dto/responses/teacher.dto";

export const GetTeachersSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all teachers",
		}),
		ApiResponse({
			status: HttpStatus.OK,
			description: "Teachers have been successfully retrieved.",
			type: [TeacherDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
