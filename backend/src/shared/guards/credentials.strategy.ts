import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/modules/auth/application/auth.service';
import { LoginDto } from '@/modules/auth/dto/requests/login.dto';

@Injectable()
export class CredentialsStrategy extends PassportStrategy(Strategy, 'credentials') {
	constructor(private readonly authService: AuthService) {
		super({
			usernameField: 'login', // Use 'login' instead of default 'username'
			passwordField: 'password',
		});
	}

	async validate(login: string, password: string): Promise<any> {
		const loginDto: LoginDto = { login, password };
		const teacher = await this.authService.validateUser(loginDto);

		if (!teacher) {
			throw new UnauthorizedException('Неверные учетные данные');
		}
		
		return teacher;
	}
}

