import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CredentialsAuthGuard extends AuthGuard('credentials') {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const result = (await super.canActivate(context)) as boolean;
		const request = context.switchToHttp().getRequest();
		
		// Attach teacher to request object for ExtractUserFromRequest decorator
		request.teacher = request.user;
		
		return result;
	}
}

