import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiBadRequestResponse, ApiNotFoundResponse, ApiNoContentResponse, ApiBody } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { UpdateStudentDto } from "@/modules/student/interface/dto/requests/update-student.dto";

export const UpdateStudentSwagger = () => {
	const decorators = [
		ApiOperation({ summary: 'Update a student' }),
		ApiNoContentResponse({ description: 'The student has been successfully updated.' }),
		ApiBody({ description: 'Student data', type: UpdateStudentDto }),
		ApiBearerAuth(),
		ApiBadRequestResponse({ description: 'Bad request.', type: BadRequestErrorResponse }),
		ApiNotFoundResponse({ description: 'Student not found' }),
	];

	return applyDecorators(...decorators);
};
