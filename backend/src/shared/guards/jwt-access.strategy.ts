import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtPayloadDto } from '@/modules/auth/dto/jwt.payload.dto';
import { AuthConfig, authConfig } from '@/config/namespaces/auth.config';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
		@Inject(authConfig.KEY) private readonly authConfig: AuthConfig,
	) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessSecretKey,
    });
  }

  async validate(payload: JwtPayloadDto) {
    if (!payload || !payload.id) {
      throw new UnauthorizedException('Неверная полезная нагрузка токена');
    }

    return {
      id: payload.id,
      login: payload.login,
      name: payload.name,
      role: payload.role,
    };
  }
}

