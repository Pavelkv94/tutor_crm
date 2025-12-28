import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { StudentExtendedOutputDto } from "src/modules/student/dto/student.output.dto";

export const GetStudentExtendedSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get a student",
		}),
		ApiOkResponse({
			description: `Student has been successfully retrieved`,
			type: StudentExtendedOutputDto,
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Student not found",
		}),
	];

	return applyDecorators(...decorators);
};
