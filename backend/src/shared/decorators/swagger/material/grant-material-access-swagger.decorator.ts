import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const GrantMaterialAccessSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Grant teachers access to a material: lifts the restriction for teachers with course access, grants it personally to the rest",
		}),
		ApiNoContentResponse({
			description: "Access has been successfully granted",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request (e.g. invalid teacher id)",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Material not found",
		}),
	];

	return applyDecorators(...decorators);
};
