import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const RevokeMaterialAccessSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Revoke teachers access to a material: restricts it for teachers with course access, removes the personal grant from the rest",
		}),
		ApiNoContentResponse({
			description: "Access has been successfully revoked",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Material not found",
		}),
	];

	return applyDecorators(...decorators);
};
