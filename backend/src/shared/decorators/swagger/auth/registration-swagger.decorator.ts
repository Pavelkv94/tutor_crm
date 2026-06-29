import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOperation, ApiTooManyRequestsResponse } from "@nestjs/swagger";
import { RegisterAdminOutputDto } from "@/modules/auth/dto/responses/register-admin-message.dto";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";

export const RegistrationSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Registrate a new admin",
		}),
		ApiCreatedResponse({
			description: `Admin registered successfully`,
			type: RegisterAdminOutputDto,
		}),
		ApiTooManyRequestsResponse({
			description: "More than 5 attempts from one IP-address during 10 seconds",
		}),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
	];

	return applyDecorators(...decorators);
};
