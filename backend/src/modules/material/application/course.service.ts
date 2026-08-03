import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CourseRepositoryPort } from "@/modules/material/application/ports/course.repository.port";
import { MaterialRepositoryPort } from "@/modules/material/application/ports/material.repository.port";
import { CourseEntity } from "@/modules/material/domain/course.entity";
import { CreateCourseDto } from "@/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "@/modules/material/interface/dto/requests/update-course.dto";

@Injectable()
export class CourseService {
	constructor(
		private readonly courseRepository: CourseRepositoryPort,
		private readonly materialRepository: MaterialRepositoryPort,
	) {}

	async createCourse(createCourseDto: CreateCourseDto): Promise<CourseEntity> {
		return await this.courseRepository.createCourse(createCourseDto);
	}

	async getCourses(): Promise<CourseEntity[]> {
		return await this.courseRepository.getCourses();
	}

	async updateCourse(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseEntity> {
		const course = await this.courseRepository.getCourseById(id);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		return await this.courseRepository.updateCourse(id, updateCourseDto);
	}

	async deleteCourse(id: number): Promise<boolean> {
		const course = await this.courseRepository.getCourseById(id);
		if (!course) {
			throw new NotFoundException("Курс не найден");
		}
		const hasFiles = await this.materialRepository.hasFiles(id);
		if (hasFiles) {
			throw new ConflictException("Нельзя удалить курс, у которого есть файлы");
		}
		return await this.courseRepository.deleteCourse(id);
	}
}
