// import { PayloadFromRequestDto } from "@libs/contracts/index";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

//todo добавить типы
export const ExtractTeacherFromRequest = createParamDecorator((_: unknown, context: ExecutionContext): any => {
	const request = context.switchToHttp().getRequest();
	const teacher = request.user;

	if (!teacher) {
		throw new Error("There is no teacher in the request object!");
	}

	return teacher;
});
