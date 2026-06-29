import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiBadRequestResponse, ApiBody, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { CreateStudentDto } from "@/modules/student/interface/dto/requests/create-student.dto";
import { StudentDto } from "@/modules/student/interface/dto/responses/student.dto";

export const CreateStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Create a student' }),
		ApiResponse({ status: HttpStatus.CREATED, description: 'The student has been successfully created.', type: StudentDto }),
		ApiBody({ description: 'Student data', type: CreateStudentDto }),
		ApiBearerAuth(),
		ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorResponse }),
	];

	return applyDecorators(...decorators);
};
