import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { CoreEnvConfig } from '../core.config';
import { JwtPayloadDto } from 'src/modules/auth/dto/jwt.payload.dto';
import { TeacherService } from 'src/modules/teacher/teacher.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    @Inject() private readonly teacherService: TeacherService,
    public readonly coreConfig: CoreEnvConfig,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          // Extract the JWT from the cookie
          return req.cookies?.refreshToken; // Ensure that the cookie name matches what you set
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: coreConfig.refreshSecretKey,
    });
  }

  async validate(payload: JwtPayloadDto) {
    console.log("Starting validation process"); // Add this log

    const teacher = await this.teacherService.getTeacherById(Number(payload.id));

		if (!teacher) {
      throw new UnauthorizedException("Teacher not found");
    }

    return teacher;
  }
}
