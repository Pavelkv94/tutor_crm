import { NestFactory } from '@nestjs/core';
import { env } from '@/config/bootstrap-env';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import { SimpleExeptionFilter } from '@/shared/exceptions/simple-exception';
import * as cookieParser from 'cookie-parser';
import { corsConfig } from '@/config/namespaces/cors.config';
import { ConfigType } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

	app.use(cookieParser());

	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalFilters(new SimpleExeptionFilter());

	// Only enable Swagger in non-production environments
	if (process.env.NODE_ENV !== 'production') {
		const config = new DocumentBuilder()
			.setTitle('School API')
			.setDescription('The School API description')
			.setVersion('1.0')
			.build();
		const documentFactory = () => SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api/swagger', app, documentFactory);
	}

	const cors = app.get<ConfigType<typeof corsConfig>>(corsConfig.KEY);

	app.enableCors({
		origin: cors.allowedOrigins, // Array of allowed origins
		credentials: true, // Allow cookies
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});

	app.setGlobalPrefix('api');

	await app.listen(env.PORT, () => {
		console.log(`Server is running on port ${process.env.PORT ?? 5000}`);
	});
}
bootstrap();
