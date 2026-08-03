import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { ViewUrlDto } from "@/modules/material/interface/dto/responses/view-url.dto";

export const OpenMaterialSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get a temporary presigned URL to view a material",
		}),
		ApiOkResponse({
			description: "Presigned view URL has been successfully generated",
			type: ViewUrlDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Material upload is not completed yet",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Material not found",
		}),
		ApiForbiddenResponse({
			description: "The teacher has no access to this material",
		}),
	];

	return applyDecorators(...decorators);
};
