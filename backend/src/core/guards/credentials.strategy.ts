import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
import { LoginInputDto } from '../../modules/auth/dto/login.input.dto';

@Injectable()
export class CredentialsStrategy extends PassportStrategy(Strategy, 'credentials') {
	constructor(private readonly authService: AuthService) {
		super({
			usernameField: 'login', // Use 'login' instead of default 'username'
			passwordField: 'password',
		});
	}

	async validate(login: string, password: string): Promise<any> {
		const loginDto: LoginInputDto = { login, password };
		const teacher = await this.authService.validateUser(loginDto);

		if (!teacher) {
			throw new UnauthorizedException('Неверные учетные данные');
		}
		
		return teacher;
	}
}

