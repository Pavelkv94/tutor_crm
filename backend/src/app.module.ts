import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { TeacherModule } from './modules/teacher/teacher.module';
@Module({
	imports: [
		CoreModule,
		ThrottlerModule.forRoot([
			{
				ttl: 10000,
				limit: 5,
			},
		]),
		AuthModule,
		TeacherModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule { }
