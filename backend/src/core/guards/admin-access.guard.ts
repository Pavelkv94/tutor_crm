import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TeacherRoleEnum } from 'src/modules/teacher/dto/teacherRole';

@Injectable()
export class AdminAccessGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new UnauthorizedException('Пользователь не аутентифицирован');
		}

		if (user.role !== TeacherRoleEnum.ADMIN) {
			throw new UnauthorizedException('Доступ запрещен. Требуется роль администратора.');
		}

		return true;
	}
}

