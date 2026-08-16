import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { MaterialDto } from "@/modules/material/interface/dto/responses/material.dto";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const RenameMaterialSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Rename a material",
		}),
		ApiOkResponse({
			description: "Material has been successfully renamed",
			type: MaterialDto,
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
