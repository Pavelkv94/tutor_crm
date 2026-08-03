import { Module } from "@nestjs/common";
import { StorageModule } from "@/infrastructure/storage/storage.module";
import { CourseService } from "./application/course.service";
import { MaterialService } from "./application/material.service";
import { CourseRepositoryPort } from "./application/ports/course.repository.port";
import { MaterialRepositoryPort } from "./application/ports/material.repository.port";
import { CourseRepository } from "./infrastructure/course.repository";
import { MaterialRepository } from "./infrastructure/material.repository";
import { MaterialController } from "./interface/material.controller";

@Module({
	imports: [StorageModule],
	controllers: [MaterialController],
	providers: [
		CourseService,
		MaterialService,
		{ provide: CourseRepositoryPort, useClass: CourseRepository },
		{ provide: MaterialRepositoryPort, useClass: MaterialRepository },
	],
	exports: [CourseService, MaterialService],
})
export class MaterialModule {}
