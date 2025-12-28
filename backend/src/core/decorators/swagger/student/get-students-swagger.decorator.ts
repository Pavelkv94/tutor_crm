import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { PlanOutputDto } from "src/modules/plan/dto/plan.output.dto";
import { StudentOutputDto } from "src/modules/student/dto/student.output.dto";

export const GetStudentsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all students",
		}),
		ApiOkResponse({
			description: `Students have been successfully retrieved`,
			type: [StudentOutputDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
