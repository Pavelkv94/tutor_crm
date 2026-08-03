import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";

export const DeleteFileSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Delete a material",
		}),
		ApiOkResponse({
			description: "Material has been successfully deleted",
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Material not found",
		}),
	];

	return applyDecorators(...decorators);
};
