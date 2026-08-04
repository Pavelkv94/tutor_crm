import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { MaterialsSizeDto } from "@/modules/material/interface/dto/responses/materials-size.dto";

export const GetMaterialsSizeSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get the total size of all uploaded materials",
		}),
		ApiOkResponse({
			description: "Total size of all uploaded materials has been successfully calculated",
			type: MaterialsSizeDto,
		}),
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};
