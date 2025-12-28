import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiBadRequestResponse, ApiBody, ApiResponse, ApiNotFoundResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/core/exeptions/simple-exception";
import { CreateStudentDto } from "src/modules/student/dto/create-student.dto";
import { StudentOutputDto } from "src/modules/student/dto/student.output.dto";

export const DeleteStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Delete a student' }),
		ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'The student has been successfully deleted.' }),
		ApiBearerAuth(),
		ApiNotFoundResponse({ description: 'Student not found' }),
	];

	return applyDecorators(...decorators);
};
