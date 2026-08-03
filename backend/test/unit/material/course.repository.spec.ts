import { Test, TestingModule } from "@nestjs/testing";
import { CourseRepository } from "../../../src/modules/material/infrastructure/course.repository";
import { PrismaService } from "../../../src/infrastructure/prisma/prisma.service";
import { CreateCourseDto } from "../../../src/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "../../../src/modules/material/interface/dto/requests/update-course.dto";

describe("CourseRepository", () => {
	let repository: CourseRepository;
	let prisma: PrismaService;

	const mockCourse = {
		id: 1,
		name: "Test Course",
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CourseRepository,
				{
					provide: PrismaService,
					useValue: {
						course: {
							create: jest.fn(),
							findMany: jest.fn(),
							findUnique: jest.fn(),
							update: jest.fn(),
							delete: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<CourseRepository>(CourseRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it("should be defined", () => {
		expect(repository).toBeDefined();
	});

	describe("createCourse", () => {
		it("should create course", async () => {
			const dto: CreateCourseDto = { name: "Test Course" };
			jest.spyOn(prisma.course, "create").mockResolvedValue(mockCourse as any);

			const result = await repository.createCourse(dto);

			expect(result).toEqual(mockCourse);
			expect(prisma.course.create).toHaveBeenCalledWith({ data: dto });
		});
	});

	describe("getCourses", () => {
		it("should return courses ordered by name", async () => {
			jest.spyOn(prisma.course, "findMany").mockResolvedValue([mockCourse] as any);

			const result = await repository.getCourses();

			expect(result).toEqual([mockCourse]);
			expect(prisma.course.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
		});
	});

	describe("getCourseById", () => {
		it("should return course entity", async () => {
			jest.spyOn(prisma.course, "findUnique").mockResolvedValue(mockCourse as any);

			const result = await repository.getCourseById(1);

			expect(result).toEqual(mockCourse);
			expect(prisma.course.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
		});

		it("should return null when not found", async () => {
			jest.spyOn(prisma.course, "findUnique").mockResolvedValue(null);

			const result = await repository.getCourseById(999);

			expect(result).toBeNull();
		});
	});

	describe("updateCourse", () => {
		it("should update course", async () => {
			const dto: UpdateCourseDto = { name: "Updated Course" };
			jest.spyOn(prisma.course, "update").mockResolvedValue({ ...mockCourse, name: "Updated Course" } as any);

			const result = await repository.updateCourse(1, dto);

			expect(result.name).toBe("Updated Course");
			expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: dto });
		});
	});

	describe("deleteCourse", () => {
		it("should delete course", async () => {
			jest.spyOn(prisma.course, "delete").mockResolvedValue(mockCourse as any);

			const result = await repository.deleteCourse(1);

			expect(result).toBe(true);
			expect(prisma.course.delete).toHaveBeenCalledWith({ where: { id: 1 } });
		});
	});
});
