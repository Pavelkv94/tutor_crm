import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { LoginOutputDto } from "src/modules/auth/dto/login.output.dto";

/**
 * @swagger
 * @response 200 - Successfully refreshed token pair
 * @response 400 - Bad request
 * @response 401 - Unauthorized
 * @response 429 - Too many requests
 */
export const RefreshTokenSwagger = () => {
	const decorators = [
		ApiOperation({ summary: "Generate new pair of jwt tokens" }),
		ApiOkResponse({
			description: "Token pair was successfully refreshed",
			type: LoginOutputDto,
		}),
		ApiUnauthorizedResponse({
			description: "If the refresh token is wrong or expired",
		}),
		ApiBearerAuth(),
		ApiTooManyRequestsResponse({
			description: "More than 5 attempts from one IP-address during 10 seconds",
		}),
	];

	return applyDecorators(...decorators);
};
