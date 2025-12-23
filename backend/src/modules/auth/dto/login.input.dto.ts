import { IsString } from "class-validator";

export class LoginInputDto {
  @IsString()
	login: string;

	@IsString()
	password: string;
}