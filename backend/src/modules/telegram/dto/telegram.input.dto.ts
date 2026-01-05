import { TelegramUserEnum } from "./telegram-user.enum";

export class TelegramInputDto {
	telegram_id: string;
	username: string | null;
	first_name: string | null;
	type: TelegramUserEnum;
	student_id: number | null;
	teacher_id: number | null;
}
