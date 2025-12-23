// import { AccessTokenDto } from "@libs/contracts/auth-contracts/output/access-token.dto";
import { applyDecorators } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { LoginOutputDto } from "src/modules/auth/dto/login.output.dto";

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
	];

	return applyDecorators(...decorators);
};
