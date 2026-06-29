import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtPayloadDto } from '@/modules/auth/dto/jwt.payload.dto';
import { TeacherService } from '@/modules/teacher/application/teacher.service';
import { AuthConfig, authConfig } from '@/config/namespaces/auth.config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject() private readonly teacherService: TeacherService,
    @Inject(authConfig.KEY) private readonly authConfig: AuthConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          // Extract the JWT from the cookie
          return req.cookies?.refreshToken; // Ensure that the cookie name matches what you set
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: authConfig.refreshSecretKey,
    });
  }

  async validate(payload: JwtPayloadDto) {
    console.log("Starting validation process"); // Add this log

    const teacher = await this.teacherService.getTeacherById(Number(payload.id));

		if (!teacher) {
      throw new UnauthorizedException("Преподаватель не найден");
    }

    return teacher;
  }
}
