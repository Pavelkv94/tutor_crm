import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { MaterialDto } from "@/modules/material/interface/dto/responses/material.dto";

export const GetCourseMaterialsSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Get all materials of a course",
		}),
		ApiOkResponse({
			description: "Materials have been successfully retrieved",
			type: [MaterialDto],
		}),
		ApiBearerAuth(),
		ApiNotFoundResponse({
			description: "Course not found",
		}),
	];

	return applyDecorators(...decorators);
};
