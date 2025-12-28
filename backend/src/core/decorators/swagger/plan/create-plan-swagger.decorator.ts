import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiBadRequestResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "src/exeptions/simple-exception";
import { PlanOutputDto } from "src/modules/plan/dto/plan.output.dto";

export const CreatePlanSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a new plan",
		}),
		ApiCreatedResponse({
			description: `Plan created successfully`,
			type: PlanOutputDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
