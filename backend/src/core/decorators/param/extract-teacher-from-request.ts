// import { PayloadFromRequestDto } from "@libs/contracts/index";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayloadDto } from "src/modules/auth/dto/jwt.payload.dto";

//todo добавить типы
export const ExtractTeacherFromRequest = createParamDecorator((_: unknown, context: ExecutionContext): JwtPayloadDto => {
	const request = context.switchToHttp().getRequest();
	const teacher = request.user;

	if (!teacher) {
		throw new Error("There is no teacher in the request object!");
	}

	return teacher;
});
