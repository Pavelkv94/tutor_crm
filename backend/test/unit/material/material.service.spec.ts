import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MaterialService } from "../../../src/modules/material/application/material.service";
import { CourseRepositoryPort } from "../../../src/modules/material/application/ports/course.repository.port";
import { MaterialRepositoryPort } from "../../../src/modules/material/application/ports/material.repository.port";
import { R2Service } from "../../../src/infrastructure/storage/r2.service";
import { UploadInitDto } from "../../../src/modules/material/interface/dto/requests/upload-init.dto";
import { UploadStatus } from "../../../src/modules/material/domain/upload-status.enum";
import { FileType } from "../../../src/modules/material/domain/file-type.enum";
import { MaterialEntity } from "../../../src/modules/material/domain/material.entity";

describe("MaterialService", () => {
	let service: MaterialService;
	let materialRepository: MaterialRepositoryPort;
	let courseRepository: CourseRepositoryPort;
	let r2Service: R2Service;

	const mockCourse = {
		id: 1,
		name: "Test Course",
		created_at: new Date(),
	};

	const uploadInitDto: UploadInitDto = {
		courseId: 1,
		teachers: [1, 2],
		fileName: "lesson5.pdf",
		mimeType: "application/pdf",
		contentType: "application/pdf",
		sizeBytes: 1024,
	};

	const mockUploadingMaterial: MaterialEntity = {
		id: 10,
		courseId: 1,
		storageKey: "1/lesson5.pdf",
		originalName: "lesson5.pdf",
		mimeType: "application/pdf",
		sizeBytes: 1024,
		type: FileType.PDF,
		status: UploadStatus.UPLOADING,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MaterialService,
				{
					provide: MaterialRepositoryPort,
					useValue: {
						createMaterial: jest.fn(),
						getMaterialById: jest.fn(),
						getMaterialsByCourseId: jest.fn(),
						updateMaterial: jest.fn(),
						hasAccess: jest.fn(),
						createFileAccess: jest.fn(),
						revokeFileAccess: jest.fn(),
						grantCourseAccess: jest.fn(),
						revokeCourseAccess: jest.fn(),
						getMaterialsSize: jest.fn(),
					},
				},
				{
					provide: CourseRepositoryPort,
					useValue: {
						getCourseById: jest.fn(),
					},
				},
				{
					provide: R2Service,
					useValue: {
						createUploadUrl: jest.fn(),
						getObjectInfo: jest.fn(),
						createReadUrl: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<MaterialService>(MaterialService);
		materialRepository = module.get<MaterialRepositoryPort>(MaterialRepositoryPort);
		courseRepository = module.get<CourseRepositoryPort>(CourseRepositoryPort);
		r2Service = module.get<R2Service>(R2Service);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("getCourseMaterials", () => {
		it("should return materials of the course", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "getMaterialsByCourseId").mockResolvedValue([
				{ ...mockUploadingMaterial, status: UploadStatus.UPLOADED },
			]);

			const result = await service.getCourseMaterials(1);

			expect(result).toEqual([{ ...mockUploadingMaterial, status: UploadStatus.UPLOADED }]);
			expect(courseRepository.getCourseById).toHaveBeenCalledWith(1);
			expect(materialRepository.getMaterialsByCourseId).toHaveBeenCalledWith(1);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.getCourseMaterials(1)).rejects.toThrow(NotFoundException);
			await expect(service.getCourseMaterials(1)).rejects.toThrow("Курс не найден");
			expect(materialRepository.getMaterialsByCourseId).not.toHaveBeenCalled();
		});
	});

	describe("uploadInit", () => {
		it("should create a pending material, grant access to the given teachers and return a presigned upload url", async () => {
			jest.spyOn(r2Service, "createUploadUrl").mockResolvedValue("https://r2.example.com/presigned-url");
			jest.spyOn(materialRepository, "createMaterial").mockResolvedValue(10);

			const result = await service.uploadInit(uploadInitDto);

			expect(r2Service.createUploadUrl).toHaveBeenCalledWith(
				expect.objectContaining({ contentType: uploadInitDto.contentType }),
			);
			expect(materialRepository.createMaterial).toHaveBeenCalledWith(
				expect.objectContaining({
					courseId: uploadInitDto.courseId,
					originalName: uploadInitDto.fileName,
					mimeType: uploadInitDto.mimeType,
					sizeBytes: uploadInitDto.sizeBytes,
					status: UploadStatus.UPLOADING,
				}),
			);
			expect(materialRepository.createFileAccess).toHaveBeenCalledWith(uploadInitDto.teachers, 10);
			expect(result).toEqual({ materialId: 10, uploadUrl: "https://r2.example.com/presigned-url" });
		});

		it("should still create the material when no teachers are provided", async () => {
			jest.spyOn(r2Service, "createUploadUrl").mockResolvedValue("https://r2.example.com/presigned-url");
			jest.spyOn(materialRepository, "createMaterial").mockResolvedValue(10);

			await service.uploadInit({ ...uploadInitDto, teachers: [] });

			expect(materialRepository.createFileAccess).toHaveBeenCalledWith([], 10);
		});
	});

	describe("uploadComplete", () => {
		it("should mark material as uploaded when size matches", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(r2Service, "getObjectInfo").mockResolvedValue({ contentLength: 1024, etag: '"abc"' });
			jest.spyOn(materialRepository, "updateMaterial").mockResolvedValue({
				...mockUploadingMaterial,
				status: UploadStatus.UPLOADED,
			});

			await service.uploadComplete(10);

			expect(materialRepository.updateMaterial).toHaveBeenCalledWith(10, {
				sizeBytes: 1024,
				status: UploadStatus.UPLOADED,
			});
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.uploadComplete(10)).rejects.toThrow(NotFoundException);
			expect(materialRepository.updateMaterial).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException if upload already completed", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue({
				...mockUploadingMaterial,
				status: UploadStatus.UPLOADED,
			});

			await expect(service.uploadComplete(10)).rejects.toThrow(BadRequestException);
			await expect(service.uploadComplete(10)).rejects.toThrow("Загрузка уже завершена");
		});

		it("should throw BadRequestException if object is missing in storage", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(r2Service, "getObjectInfo").mockResolvedValue(null);

			await expect(service.uploadComplete(10)).rejects.toThrow(BadRequestException);
			expect(materialRepository.updateMaterial).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException if actual size does not match expected size", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(r2Service, "getObjectInfo").mockResolvedValue({ contentLength: 2048, etag: '"abc"' });

			await expect(service.uploadComplete(10)).rejects.toThrow(BadRequestException);
			await expect(service.uploadComplete(10)).rejects.toThrow("Размер файла не совпадает с заявленным");
			expect(materialRepository.updateMaterial).not.toHaveBeenCalled();
		});
	});

	describe("getViewUrl", () => {
		const mockUploadedMaterial: MaterialEntity = {
			...mockUploadingMaterial,
			status: UploadStatus.UPLOADED,
		};

		it("should return a presigned view url when the teacher has access", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadedMaterial);
			jest.spyOn(materialRepository, "hasAccess").mockResolvedValue(true);
			jest.spyOn(r2Service, "createReadUrl").mockResolvedValue("https://r2.example.com/view-url");

			const result = await service.getViewUrl(10, 5, "TEACHER");

			expect(materialRepository.hasAccess).toHaveBeenCalledWith(5, 10);
			expect(r2Service.createReadUrl).toHaveBeenCalledWith(mockUploadedMaterial.storageKey, 60);
			expect(result).toEqual({ url: "https://r2.example.com/view-url" });
		});

		it("should return a presigned view url for an admin without checking access", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadedMaterial);
			jest.spyOn(r2Service, "createReadUrl").mockResolvedValue("https://r2.example.com/view-url");

			const result = await service.getViewUrl(10, 5, "ADMIN");

			expect(materialRepository.hasAccess).not.toHaveBeenCalled();
			expect(result).toEqual({ url: "https://r2.example.com/view-url" });
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.getViewUrl(10, 5, "TEACHER")).rejects.toThrow(NotFoundException);
			expect(materialRepository.hasAccess).not.toHaveBeenCalled();
		});

		it("should throw BadRequestException if material upload is not completed", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);

			await expect(service.getViewUrl(10, 5, "TEACHER")).rejects.toThrow(BadRequestException);
			await expect(service.getViewUrl(10, 5, "TEACHER")).rejects.toThrow("Материал ещё не загружен");
			expect(materialRepository.hasAccess).not.toHaveBeenCalled();
		});

		it("should throw ForbiddenException if the teacher has no access", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadedMaterial);
			jest.spyOn(materialRepository, "hasAccess").mockResolvedValue(false);

			await expect(service.getViewUrl(10, 5, "TEACHER")).rejects.toThrow(ForbiddenException);
			await expect(service.getViewUrl(10, 5, "TEACHER")).rejects.toThrow("Нет доступа к этому материалу");
		});
	});

	describe("getMaterialsSize", () => {
		it("should return the total size of all uploaded materials", async () => {
			jest.spyOn(materialRepository, "getMaterialsSize").mockResolvedValue(3072);

			const result = await service.getMaterialsSize();

			expect(result).toBe(3072);
			expect(materialRepository.getMaterialsSize).toHaveBeenCalled();
		});
	});

	describe("grantMaterialAccess", () => {
		it("should grant access when the material exists", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);

			await service.grantMaterialAccess(10, [5, 6]);

			expect(materialRepository.createFileAccess).toHaveBeenCalledWith([5, 6], 10);
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.grantMaterialAccess(10, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.createFileAccess).not.toHaveBeenCalled();
		});
	});

	describe("revokeMaterialAccess", () => {
		it("should revoke access when the material exists", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);

			await service.revokeMaterialAccess(10, [5, 6]);

			expect(materialRepository.revokeFileAccess).toHaveBeenCalledWith([5, 6], 10);
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.revokeMaterialAccess(10, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.revokeFileAccess).not.toHaveBeenCalled();
		});
	});

	describe("grantCourseAccess", () => {
		it("should grant access when the course exists", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);

			await service.grantCourseAccess(1, [5, 6]);

			expect(materialRepository.grantCourseAccess).toHaveBeenCalledWith(1, [5, 6]);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.grantCourseAccess(1, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.grantCourseAccess).not.toHaveBeenCalled();
		});
	});

	describe("revokeCourseAccess", () => {
		it("should revoke access when the course exists", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);

			await service.revokeCourseAccess(1, [5, 6]);

			expect(materialRepository.revokeCourseAccess).toHaveBeenCalledWith(1, [5, 6]);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.revokeCourseAccess(1, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.revokeCourseAccess).not.toHaveBeenCalled();
		});
	});
});
