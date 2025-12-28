import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiBadRequestResponse, ApiBody, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { CreateStudentDto } from "src/modules/student/dto/create-student.dto";
import { StudentOutputDto } from "src/modules/student/dto/student.output.dto";

export const CreateStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Create a student' }),
		ApiResponse({ status: HttpStatus.CREATED, description: 'The student has been successfully created.', type: StudentOutputDto }),
		ApiBody({ description: 'Student data', type: CreateStudentDto }),
		ApiBearerAuth(),
		ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorResponse }),
	];

	return applyDecorators(...decorators);
};
