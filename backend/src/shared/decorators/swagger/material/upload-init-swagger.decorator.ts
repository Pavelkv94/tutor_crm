import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { UploadInitResponseDto } from "@/modules/material/interface/dto/responses/upload-init-response.dto";

export const UploadInitSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Initialize a material upload and get a presigned URL to upload the file to R2",
		}),
		ApiOkResponse({
			description: "Upload has been successfully initialized",
			type: UploadInitResponseDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
