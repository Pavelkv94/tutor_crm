import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';
import { SimpleExeptionFilter } from './core/exeptions/simple-exception';
import * as cookieParser from 'cookie-parser';

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

	// Parse comma-separated origins from environment variable
	const origins = process.env.ORIGIN_URLS
		? process.env.ORIGIN_URLS.split(',').map((url) => url.trim())
		: [];

	app.enableCors({
		origin: origins.length > 0 ? origins : true, // Array of allowed origins
		credentials: true, // Allow cookies
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	});
	app.setGlobalPrefix('api');

	await app.listen(process.env.PORT ?? 5000, () => {
		console.log(`Server is running on port ${process.env.PORT ?? 5000}`);
	});
}
bootstrap();
