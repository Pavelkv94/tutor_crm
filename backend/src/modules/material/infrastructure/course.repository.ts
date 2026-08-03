import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma/prisma.service";
import { Course } from "@/infrastructure/prisma/generated/client";
import { CourseRepositoryPort } from "@/modules/material/application/ports/course.repository.port";
import { CourseEntity } from "@/modules/material/domain/course.entity";
import { CreateCourseDto } from "@/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "@/modules/material/interface/dto/requests/update-course.dto";

@Injectable()
export class CourseRepository implements CourseRepositoryPort {
	constructor(private readonly prisma: PrismaService) {}

	async createCourse(createCourseDto: CreateCourseDto): Promise<CourseEntity> {
		const course = await this.prisma.course.create({
			data: createCourseDto,
		});
		return this.mapCourseToEntity(course);
	}

	async getCourses(): Promise<CourseEntity[]> {
		const courses = await this.prisma.course.findMany({
			orderBy: { name: "asc" },
		});
		return courses.map(this.mapCourseToEntity);
	}

	async getCourseById(id: number): Promise<CourseEntity | null> {
		const course = await this.prisma.course.findUnique({
			where: { id },
		});
		if (!course) {
			return null;
		}
		return this.mapCourseToEntity(course);
	}

	async updateCourse(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseEntity> {
		const course = await this.prisma.course.update({
			where: { id },
			data: updateCourseDto,
		});
		return this.mapCourseToEntity(course);
	}

	async deleteCourse(id: number): Promise<boolean> {
		const result = await this.prisma.course.delete({
			where: { id },
		});
		return result !== null;
	}

	private mapCourseToEntity(course: Course): CourseEntity {
		return {
			id: course.id,
			name: course.name,
			created_at: course.created_at,
		};
	}
}
