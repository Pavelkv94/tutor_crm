import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const UploadCompleteSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Confirm that a material has been uploaded to R2 and persist its actual size",
		}),
		ApiOkResponse({
			description: "Upload has been successfully completed",
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Upload already completed, file missing in storage or size mismatch",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Material not found",
		}),
	];

	return applyDecorators(...decorators);
};
