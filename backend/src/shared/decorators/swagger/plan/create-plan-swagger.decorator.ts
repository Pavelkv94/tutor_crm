import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiBadRequestResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { PlanDto } from "@/modules/plan/interface/dto/responses/plan.dto";

export const CreatePlanSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Create a new plan",
		}),
		ApiCreatedResponse({
			description: `Plan created successfully`,
			type: PlanDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
