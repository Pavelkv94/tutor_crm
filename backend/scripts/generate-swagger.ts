import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function generateSwagger() {
	const app = await NestFactory.create(AppModule);

	const config = new DocumentBuilder()
		.setTitle('School API')
		.setDescription('The School API description')
		.setVersion('1.0')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	const outputPath = resolve(__dirname, '../swagger.json');

	writeFileSync(outputPath, JSON.stringify(document, null, 2));
	console.log(`✅ Swagger JSON generated successfully at: ${outputPath}`);

	await app.close();
	process.exit(0);
}

generateSwagger().catch((error) => {
	console.error('❌ Error generating Swagger JSON:', error);
	process.exit(1);
});

