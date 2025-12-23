import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { CoreEnvConfig } from '../core.config';
import { JwtPayloadDto } from 'src/modules/auth/dto/jwt.payload.dto';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(public readonly coreConfig: CoreEnvConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: coreConfig.accessSecretKey,
    });
  }

  async validate(payload: JwtPayloadDto) {
    if (!payload || !payload.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.id,
      login: payload.login,
      name: payload.name,
      role: payload.role,
    };
  }
}

