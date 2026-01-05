import { TelegramUserEnum } from "./telegram-user.enum";

export class TokenDataInputDto {
	token: string;
	expired_at: Date;
	teacher_id: number | null;
	student_id: number | null;
	type: TelegramUserEnum;
}