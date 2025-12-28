import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { PlanOutputDto } from "src/modules/plan/dto/plan.output.dto";

export const GetPlansSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all plans",
		}),
		ApiOkResponse({
			description: `Plans have been successfully retrieved`,
			type: [PlanOutputDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
