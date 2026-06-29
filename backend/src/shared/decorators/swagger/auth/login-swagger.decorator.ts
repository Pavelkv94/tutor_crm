// import { AccessTokenDto } from "@libs/contracts/auth-contracts/output/access-token.dto";
import { applyDecorators } from "@nestjs/common";
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { LoginOutputDto } from "@/modules/auth/dto/responses/access-token.dto";

export const LoginSwagger = () => {
	const decorators = [
		ApiOperation({ summary: "Login teacher" }),
		ApiOkResponse({
			description: "Teacher was successfully logged in",
			type: LoginOutputDto,
		}),
		ApiUnauthorizedResponse({
			description: "If the password or login or email is wrong",
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
