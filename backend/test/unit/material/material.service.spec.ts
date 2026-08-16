import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MaterialService } from "../../../src/modules/material/application/material.service";
import { CourseRepositoryPort } from "../../../src/modules/material/application/ports/course.repository.port";
import { MaterialRepositoryPort } from "../../../src/modules/material/application/ports/material.repository.port";
import { R2Service } from "../../../src/infrastructure/storage/r2.service";
import { UploadInitDto } from "../../../src/modules/material/interface/dto/requests/upload-init.dto";
import { UploadStatus } from "../../../src/modules/material/domain/upload-status.enum";
import { FileType } from "../../../src/modules/material/domain/file-type.enum";
import { AccessSource } from "../../../src/modules/material/domain/access-source.enum";
import { FileAccessType } from "../../../src/modules/material/domain/file-access-type.enum";
import { TeacherRoleEnum } from "../../../src/modules/teacher/interface/dto/teacherRole";
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
						renameMaterial: jest.fn(),
						deleteMaterial: jest.fn(),
						hasAccess: jest.fn(),
						setFileAccess: jest.fn(),
						clearFileAccess: jest.fn(),
						grantCourseAccess: jest.fn(),
						revokeCourseAccess: jest.fn(),
						getCourseAccessTeachers: jest.fn(),
						filterTeachersWithCourseAccess: jest.fn().mockResolvedValue([]),
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
						deleteObject: jest.fn(),
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
		const materialWithTeachers = {
			...mockUploadingMaterial,
			status: UploadStatus.UPLOADED,
			teachers: [{ id: 5, name: "Teacher Five", accessSource: AccessSource.COURSE }],
			restrictedTeachers: [],
		};

		it("should mark materials the requesting teacher has access to", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "getMaterialsByCourseId").mockResolvedValue([materialWithTeachers]);

			const result = await service.getCourseMaterials(1, 5, TeacherRoleEnum.TEACHER);

			expect(result).toEqual([{ ...materialWithTeachers, hasAccess: true }]);
			expect(courseRepository.getCourseById).toHaveBeenCalledWith(1);
			expect(materialRepository.getMaterialsByCourseId).toHaveBeenCalledWith(1);
		});

		it("should mark materials the requesting teacher has no access to", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "getMaterialsByCourseId").mockResolvedValue([materialWithTeachers]);

			const result = await service.getCourseMaterials(1, 99, TeacherRoleEnum.TEACHER);

			expect(result[0].hasAccess).toBe(false);
		});

		it("should always grant access to an admin", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "getMaterialsByCourseId").mockResolvedValue([materialWithTeachers]);

			const result = await service.getCourseMaterials(1, 99, TeacherRoleEnum.ADMIN);

			expect(result[0].hasAccess).toBe(true);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.getCourseMaterials(1, 5, TeacherRoleEnum.TEACHER)).rejects.toThrow(NotFoundException);
			await expect(service.getCourseMaterials(1, 5, TeacherRoleEnum.TEACHER)).rejects.toThrow("Курс не найден");
			expect(materialRepository.getMaterialsByCourseId).not.toHaveBeenCalled();
		});
	});

	describe("getCourseAccess", () => {
		it("should return teachers with course access", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(mockCourse);
			jest.spyOn(materialRepository, "getCourseAccessTeachers").mockResolvedValue([{ id: 5, name: "Teacher Five" }]);

			const result = await service.getCourseAccess(1);

			expect(result).toEqual([{ id: 5, name: "Teacher Five" }]);
			expect(materialRepository.getCourseAccessTeachers).toHaveBeenCalledWith(1);
		});

		it("should throw NotFoundException if course not found", async () => {
			jest.spyOn(courseRepository, "getCourseById").mockResolvedValue(null);

			await expect(service.getCourseAccess(1)).rejects.toThrow(NotFoundException);
			expect(materialRepository.getCourseAccessTeachers).not.toHaveBeenCalled();
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
			expect(materialRepository.setFileAccess).toHaveBeenCalledWith(uploadInitDto.teachers, 10, FileAccessType.ALLOW);
			expect(result).toEqual({ materialId: 10, uploadUrl: "https://r2.example.com/presigned-url" });
		});

		it("should still create the material when no teachers are provided", async () => {
			jest.spyOn(r2Service, "createUploadUrl").mockResolvedValue("https://r2.example.com/presigned-url");
			jest.spyOn(materialRepository, "createMaterial").mockResolvedValue(10);

			await service.uploadInit({ ...uploadInitDto, teachers: [] });

			expect(materialRepository.setFileAccess).toHaveBeenCalledWith([], 10, FileAccessType.ALLOW);
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

	describe("renameMaterial", () => {
		it("should rename the material when it exists", async () => {
			const renamedMaterial = { ...mockUploadingMaterial, originalName: "renamed.pdf" };
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(materialRepository, "renameMaterial").mockResolvedValue(renamedMaterial);

			const result = await service.renameMaterial(10, "renamed.pdf");

			expect(result).toEqual({ ...renamedMaterial, hasAccess: true });
			expect(materialRepository.renameMaterial).toHaveBeenCalledWith(10, "renamed.pdf");
		});

		it("should throw NotFoundException when the material does not exist", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.renameMaterial(10, "renamed.pdf")).rejects.toThrow(NotFoundException);
			expect(materialRepository.renameMaterial).not.toHaveBeenCalled();
		});
	});

	describe("deleteMaterial", () => {
		it("should delete the database record before removing the object from storage", async () => {
			const callOrder: string[] = [];
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(materialRepository, "deleteMaterial").mockImplementation(async () => {
				callOrder.push("repository");
			});
			jest.spyOn(r2Service, "deleteObject").mockImplementation(async () => {
				callOrder.push("storage");
			});

			await service.deleteMaterial(10);

			expect(callOrder).toEqual(["repository", "storage"]);
			expect(materialRepository.deleteMaterial).toHaveBeenCalledWith(10);
			expect(r2Service.deleteObject).toHaveBeenCalledWith(mockUploadingMaterial.storageKey);
		});

		it("should throw NotFoundException when the material does not exist", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.deleteMaterial(10)).rejects.toThrow(NotFoundException);
			expect(materialRepository.deleteMaterial).not.toHaveBeenCalled();
			expect(r2Service.deleteObject).not.toHaveBeenCalled();
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
		it("should lift the restriction for teachers with course access and grant it personally to the rest", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(materialRepository, "filterTeachersWithCourseAccess").mockResolvedValue([5]);

			await service.grantMaterialAccess(10, [5, 6]);

			expect(materialRepository.filterTeachersWithCourseAccess).toHaveBeenCalledWith(mockUploadingMaterial.courseId, [5, 6]);
			expect(materialRepository.clearFileAccess).toHaveBeenCalledWith([5], 10);
			expect(materialRepository.setFileAccess).toHaveBeenCalledWith([6], 10, FileAccessType.ALLOW);
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.grantMaterialAccess(10, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.setFileAccess).not.toHaveBeenCalled();
			expect(materialRepository.clearFileAccess).not.toHaveBeenCalled();
		});
	});

	describe("revokeMaterialAccess", () => {
		it("should restrict the material for teachers with course access and drop personal grants of the rest", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(mockUploadingMaterial);
			jest.spyOn(materialRepository, "filterTeachersWithCourseAccess").mockResolvedValue([5]);

			await service.revokeMaterialAccess(10, [5, 6]);

			expect(materialRepository.setFileAccess).toHaveBeenCalledWith([5], 10, FileAccessType.DENY);
			expect(materialRepository.clearFileAccess).toHaveBeenCalledWith([6], 10);
		});

		it("should throw NotFoundException if material not found", async () => {
			jest.spyOn(materialRepository, "getMaterialById").mockResolvedValue(null);

			await expect(service.revokeMaterialAccess(10, [5])).rejects.toThrow(NotFoundException);
			expect(materialRepository.setFileAccess).not.toHaveBeenCalled();
			expect(materialRepository.clearFileAccess).not.toHaveBeenCalled();
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
