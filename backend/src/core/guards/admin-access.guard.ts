import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TeacherRoleEnum } from 'src/modules/teacher/dto/teacherRole';

@Injectable()
export class AdminAccessGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user) {
			throw new UnauthorizedException('User not authenticated');
		}

		if (user.role !== TeacherRoleEnum.ADMIN) {
			throw new UnauthorizedException('Access denied. Admin role required.');
		}

		return true;
	}
}

