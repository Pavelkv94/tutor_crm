import { Test, TestingModule } from "@nestjs/testing";
import { MaterialController } from "../../../src/modules/material/interface/material.controller";
import { CourseService } from "../../../src/modules/material/application/course.service";
import { MaterialService } from "../../../src/modules/material/application/material.service";
import { CreateCourseDto } from "../../../src/modules/material/interface/dto/requests/create-course.dto";
import { UpdateCourseDto } from "../../../src/modules/material/interface/dto/requests/update-course.dto";
import { UploadInitDto } from "../../../src/modules/material/interface/dto/requests/upload-init.dto";

describe("MaterialController", () => {
	let controller: MaterialController;
	let courseService: CourseService;
	let materialService: MaterialService;

	const mockCourseEntity = {
		id: 1,
		name: "Test Course",
		created_at: new Date(),
	};

	const mockCourseDto = {
		id: 1,
		name: "Test Course",
		created_at: mockCourseEntity.created_at,
	};

	const mockCourseService = {
		createCourse: jest.fn(),
		getCourses: jest.fn(),
		updateCourse: jest.fn(),
		deleteCourse: jest.fn(),
	};

	const mockMaterialService = {
		getCourseMaterials: jest.fn(),
		uploadInit: jest.fn(),
		uploadComplete: jest.fn(),
		getViewUrl: jest.fn(),
		getMaterialsSize: jest.fn(),
		grantMaterialAccess: jest.fn(),
		revokeMaterialAccess: jest.fn(),
		grantCourseAccess: jest.fn(),
		revokeCourseAccess: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [MaterialController],
			providers: [
				{
					provide: CourseService,
					useValue: mockCourseService,
				},
				{
					provide: MaterialService,
					useValue: mockMaterialService,
				},
			],
		}).compile();

		controller = module.get<MaterialController>(MaterialController);
		courseService = module.get<CourseService>(CourseService);
		materialService = module.get<MaterialService>(MaterialService);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("getCourses", () => {
		it("should return courses mapped to response dto", async () => {
			jest.spyOn(courseService, "getCourses").mockResolvedValue([mockCourseEntity]);

			const result = await controller.getCourses();

			expect(result).toEqual([mockCourseDto]);
			expect(courseService.getCourses).toHaveBeenCalled();
		});
	});

	describe("createCourse", () => {
		it("should create course and map to response", async () => {
			const dto: CreateCourseDto = { name: "Test Course" };
			jest.spyOn(courseService, "createCourse").mockResolvedValue(mockCourseEntity);

			const result = await controller.createCourse(dto);

			expect(courseService.createCourse).toHaveBeenCalledWith(dto);
			expect(result).toEqual(mockCourseDto);
		});
	});

	describe("updateCourse", () => {
		it("should update course and map to response", async () => {
			const dto: UpdateCourseDto = { name: "Updated Course" };
			const updatedEntity = { ...mockCourseEntity, name: "Updated Course" };
			jest.spyOn(courseService, "updateCourse").mockResolvedValue(updatedEntity);

			const result = await controller.updateCourse("1", dto);

			expect(courseService.updateCourse).toHaveBeenCalledWith(1, dto);
			expect(result.name).toBe("Updated Course");
		});
	});

	describe("deleteCourse", () => {
		it("should delegate to service and return boolean", async () => {
			jest.spyOn(courseService, "deleteCourse").mockResolvedValue(true);

			const result = await controller.deleteCourse("1");

			expect(result).toBe(true);
			expect(courseService.deleteCourse).toHaveBeenCalledWith(1);
		});
	});

	describe("getCourseMaterials", () => {
		it("should return materials of the course mapped to response dto", async () => {
			const mockMaterialEntity = {
				id: 10,
				courseId: 1,
				storageKey: "1/uuid-lesson5.pdf",
				originalName: "lesson5.pdf",
				mimeType: "application/pdf",
				sizeBytes: 1024,
				type: "PDF",
				status: "UPLOADED",
				created_at: new Date(),
				teachers: [{ id: 5, name: "Teacher Five" }],
			};
			jest.spyOn(materialService, "getCourseMaterials").mockResolvedValue([mockMaterialEntity as any]);

			const result = await controller.getCourseMaterials("1");

			expect(materialService.getCourseMaterials).toHaveBeenCalledWith(1);
			expect(result).toEqual([
				{
					id: mockMaterialEntity.id,
					courseId: mockMaterialEntity.courseId,
					originalName: mockMaterialEntity.originalName,
					mimeType: mockMaterialEntity.mimeType,
					sizeBytes: mockMaterialEntity.sizeBytes,
					type: mockMaterialEntity.type,
					status: mockMaterialEntity.status,
					created_at: mockMaterialEntity.created_at,
					teachers: mockMaterialEntity.teachers,
				},
			]);
		});
	});

	describe("uploadInit", () => {
		it("should delegate to material service", async () => {
			const dto: UploadInitDto = {
				courseId: 1,
				teachers: [1, 2],
				fileName: "lesson5.pdf",
				mimeType: "application/pdf",
				contentType: "application/pdf",
				sizeBytes: 1024,
			};
			const response = { materialId: 10, uploadUrl: "https://r2.example.com/presigned-url" };
			jest.spyOn(materialService, "uploadInit").mockResolvedValue(response);

			const result = await controller.uploadInit(dto);

			expect(materialService.uploadInit).toHaveBeenCalledWith(dto);
			expect(result).toEqual(response);
		});
	});

	describe("uploadComplete", () => {
		it("should delegate to material service", async () => {
			jest.spyOn(materialService, "uploadComplete").mockResolvedValue(undefined);

			await controller.uploadComplete("10");

			expect(materialService.uploadComplete).toHaveBeenCalledWith(10);
		});
	});

	describe("openMaterial", () => {
		it("should delegate to material service using the teacher extracted from the request", async () => {
			const teacher = { id: "5", login: "teacher", name: "Teacher", role: "TEACHER" };
			const response = { url: "https://r2.example.com/view-url" };
			jest.spyOn(materialService, "getViewUrl").mockResolvedValue(response);

			const result = await controller.openMaterial("10", teacher);

			expect(materialService.getViewUrl).toHaveBeenCalledWith(10, 5, "TEACHER");
			expect(result).toEqual(response);
		});
	});

	describe("getMaterialsSize", () => {
		it("should return the total size of all materials wrapped in a response dto", async () => {
			jest.spyOn(materialService, "getMaterialsSize").mockResolvedValue(3072);

			const result = await controller.getMaterialsSize();

			expect(materialService.getMaterialsSize).toHaveBeenCalled();
			expect(result).toEqual({ totalSizeBytes: 3072 });
		});
	});

	describe("grantMaterialAccess", () => {
		it("should delegate to material service", async () => {
			jest.spyOn(materialService, "grantMaterialAccess").mockResolvedValue(undefined);

			await controller.grantMaterialAccess("10", { teacherIds: [5, 6] });

			expect(materialService.grantMaterialAccess).toHaveBeenCalledWith(10, [5, 6]);
		});
	});

	describe("revokeMaterialAccess", () => {
		it("should delegate to material service", async () => {
			jest.spyOn(materialService, "revokeMaterialAccess").mockResolvedValue(undefined);

			await controller.revokeMaterialAccess("10", { teacherIds: [5] });

			expect(materialService.revokeMaterialAccess).toHaveBeenCalledWith(10, [5]);
		});
	});

	describe("grantCourseAccess", () => {
		it("should delegate to material service", async () => {
			jest.spyOn(materialService, "grantCourseAccess").mockResolvedValue(undefined);

			await controller.grantCourseAccess("1", { teacherIds: [5, 6] });

			expect(materialService.grantCourseAccess).toHaveBeenCalledWith(1, [5, 6]);
		});
	});

	describe("revokeCourseAccess", () => {
		it("should delegate to material service", async () => {
			jest.spyOn(materialService, "revokeCourseAccess").mockResolvedValue(undefined);

			await controller.revokeCourseAccess("1", { teacherIds: [5] });

			expect(materialService.revokeCourseAccess).toHaveBeenCalledWith(1, [5]);
		});
	});
});
