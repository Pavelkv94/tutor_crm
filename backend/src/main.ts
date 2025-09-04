import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());

	const config = new DocumentBuilder()
		.setTitle('School API')
		.setDescription('The School API description')
		.setVersion('1.0')
		.addTag('school')
		.build();
	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api/swagger', app, documentFactory);

	app.enableCors();
	app.setGlobalPrefix('api');

	await app.listen(process.env.PORT ?? 3000, () => {
		console.log(`Server is running on port ${process.env.PORT ?? 3000}`);
	});
}
bootstrap();
