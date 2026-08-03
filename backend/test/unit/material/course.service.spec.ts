import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CourseService } from "../../../src/modules/material/application/course.service";
import { CourseRepositoryPort } from "../../../src/modules/material/application/ports/course.repository.port";
import { MaterialRepositoryPort } from "../../../src/modules/material/application/ports/material.repository.port";
import { CreateCourseDto } from "../../../src/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "../../../src/modules/material/interface/dto/requests/update-course.dto";

describe("CourseService", () => {
	let service: CourseService;
	let courseRepository: CourseRepositoryPort;
	let materialRepository: MaterialRepositoryPort;

	const mockCourse = {
		id: 1,
		name: "Test Course",
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CourseService,
				{
					provide: CourseRepositoryPort,
					useValue: {
						createCourse: jest.fn(),
						getCourses: jest.fn(),
						getCourseById: jest.fn(),
						updateCourse: jest.fn(),
						deleteCourse: jest.fn(),
					},
				},
				{
					provide: MaterialRepositoryPort,
					useValue: {
						hasFiles: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<CourseService>(CourseService);
		courseRepository = module.get<CourseRepositoryPort>(CourseRepositoryPort);
		materialRepository = module.get<MaterialRepositoryPort>(MaterialRepositoryPort);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("createCourse", () => {
		const createCourseDto: CreateCourseDto = { name: "Test Course" };

		it("should create course successfully", async () => {
			jest.spyOn(courseRepository, "createCourse").mockResolvedValue(mockCourse);

			const result = await service.createCourse(createCourseDto);

			expect(result).toEqual(mockCourse);
			expect(courseRepository.createCourse).toHaveBeenCalledWith(createCourseDto);
		});
	});

	describe("getCourses", () => {
		it("should return all courses", async () => {
			jest.spyOn(courseRepository, "getCourses").mockResolvedValue([mockCourse]);

			const result = await service.getCourses();

			expect(result).toEqual([mockCourse]);
			expect(courseRepository.getCourses).toHaveBeenCalled();
		});
	});

	describe("updateCourse", () => {
		const updateCourseDto: UpdateCourseDto = { name: "Updated Course" };

		it("should update course successfully", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(courseRepository, "updateCourse").mockResolvedValue({ ...mockCourse, name: "Updated Course" });

			const result = await service.updateCourse(1, updateCourseDto);

			expect(result.name).toBe("Updated Course");
			expect(courseRepository.getCourseById).toHaveBeenCalledWith(1);
			expect(courseRepository.updateCourse).toHaveBeenCalledWith(1, updateCourseDto);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.updateCourse(1, updateCourseDto)).rejects.toThrow(NotFoundException);
			await expect(service.updateCourse(1, updateCourseDto)).rejects.toThrow("Курс не найден");
			expect(courseRepository.updateCourse).not.toHaveBeenCalled();
		});
	});

	describe("deleteCourse", () => {
		it("should delete course successfully when it has no files", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "hasFiles").mockResolvedValue(false);
			jest.spyOn(courseRepository, "deleteCourse").mockResolvedValue(true);

			const result = await service.deleteCourse(1);

			expect(result).toBe(true);
			expect(courseRepository.getCourseById).toHaveBeenCalledWith(1);
			expect(materialRepository.hasFiles).toHaveBeenCalledWith(1);
			expect(courseRepository.deleteCourse).toHaveBeenCalledWith(1);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.deleteCourse(1)).rejects.toThrow(NotFoundException);
			await expect(service.deleteCourse(1)).rejects.toThrow("Курс не найден");
			expect(courseRepository.deleteCourse).not.toHaveBeenCalled();
		});

		it("should throw ConflictException if course has files", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "hasFiles").mockResolvedValue(true);

			await expect(service.deleteCourse(1)).rejects.toThrow(ConflictException);
			await expect(service.deleteCourse(1)).rejects.toThrow("Нельзя удалить курс, у которого есть файлы");
			expect(courseRepository.deleteCourse).not.toHaveBeenCalled();
		});
	});
});
