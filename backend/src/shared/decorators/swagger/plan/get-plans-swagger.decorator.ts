import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { PlanDto } from "@/modules/plan/interface/dto/responses/plan.dto";

export const GetPlansSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all plans",
		}),
		ApiOkResponse({
			description: `Plans have been successfully retrieved`,
			type: [PlanDto],
		}),
		ApiBearerAuth()
	];

	return applyDecorators(...decorators);
};
