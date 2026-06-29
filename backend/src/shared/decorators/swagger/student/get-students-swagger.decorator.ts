import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { StudentDto } from "@/modules/student/interface/dto/responses/student.dto";

export const GetStudentsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all students for current teacher, or if current teacher is admin, get students by teacher ID in query",
		}),
		ApiQuery({
			name: 'teacher_id',
			description: 'Teacher ID',
			required: false,
			type: String,
		}),
		ApiOkResponse({
			description: `Students have been successfully retrieved for current teacher`,
			type: [StudentDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
