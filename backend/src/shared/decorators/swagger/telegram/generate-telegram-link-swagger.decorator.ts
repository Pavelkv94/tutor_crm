import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BadRequestErrorResponse } from "@/shared/exceptions/simple-exception";
import { TelegramLinkOutputDto } from "@/modules/telegram/interface/dto/responses/telegram-link.output.dto";

export const GenerateTelegramLinkSwagger = () => {
	const decorators = [
		ApiOperation({
			summary: "Generate a telegram link for a teacher",
		}),
		ApiResponse({
			status: HttpStatus.CREATED,
			description: "Telegram link has been successfully generated.",
			type: TelegramLinkOutputDto,
		}),
		ApiBearerAuth(),
		ApiBadRequestResponse({
			description: "Bad request",
			type: BadRequestErrorResponse,
		}),
		ApiNotFoundResponse({
			description: "Teacher not found",
		}),
	];

	return applyDecorators(...decorators);
};
