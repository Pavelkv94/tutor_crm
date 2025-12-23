import { applyDecorators } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiResponse, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { BadRequestResponse } from "../common/BadRequestResponse";
import { RegisterAdminOutputDto } from "src/modules/auth/dto/register-admin.output.dto";

export const RegistrationSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Registrate a new admin",
		}),
		ApiCreatedResponse({
			description: `Admin registered successfully`,
			type: RegisterAdminOutputDto,
		}),
		ApiResponse(BadRequestResponse),
		ApiTooManyRequestsResponse({
			description: "More than 5 attempts from one IP-address during 10 seconds",
		}),
	];

	return applyDecorators(...decorators);
};
