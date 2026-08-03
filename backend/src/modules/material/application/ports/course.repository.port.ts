import { CourseEntity } from "@/modules/material/domain/course.entity";
import { CreateCourseDto } from "@/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "@/modules/material/interface/dto/requests/update-course.dto";

export abstract class CourseRepositoryPort {
	abstract createCourse(createCourseDto: CreateCourseDto): Promise<CourseEntity>;
	abstract getCourses(): Promise<CourseEntity[]>;
	abstract getCourseById(id: number): Promise<CourseEntity | null>;
	abstract updateCourse(id: number, updateCourseDto: UpdateCourseDto): Promise<CourseEntity>;
	abstract deleteCourse(id: number): Promise<boolean>;
}
