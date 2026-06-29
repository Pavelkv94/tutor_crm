import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { StudentExtendedDto } from "@/modules/student/interface/dto/responses/student.dto";

export const GetStudentExtendedSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get a student",
		}),
		ApiOkResponse({
			description: `Student has been successfully retrieved`,
			type: StudentExtendedDto,
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
	];

	return applyDecorators(...decorators);
};
