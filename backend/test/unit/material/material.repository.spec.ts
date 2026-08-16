import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MaterialRepository } from "../../../src/modules/material/infrastructure/material.repository";
import { PrismaService } from "../../../src/infrastructure/prisma/prisma.service";
import { FileAccessType, FileType, UploadStatus } from "../../../src/infrastructure/prisma/generated/client";
import { AccessSource } from "../../../src/modules/material/domain/access-source.enum";
import { FileAccessType as DomainFileAccessType } from "../../../src/modules/material/domain/file-access-type.enum";
import { CreateMaterialParams, UpdateMaterialParams } from "../../../src/modules/material/application/ports/material.repository.port";

describe("MaterialRepository", () => {
	let repository: MaterialRepository;
	let prisma: PrismaService;

	const mockFile = {
		id: 10,
		course_id: 1,
		storage_key: "1/uuid-lesson5.pdf",
		original_name: "lesson5.pdf",
		mime_type: "application/pdf",
		size_bytes: 1024,
		type: FileType.PDF,
		upload_status: UploadStatus.UPLOADING,
		created_at: new Date(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MaterialRepository,
				{
					provide: PrismaService,
					useValue: {
						file: {
							create: jest.fn(),
							findUnique: jest.fn(),
							findMany: jest.fn(),
							update: jest.fn(),
							delete: jest.fn(),
							count: jest.fn(),
							aggregate: jest.fn(),
						},
						fileAccess: {
							findFirst: jest.fn(),
							createMany: jest.fn(),
							deleteMany: jest.fn(),
						},
						courseAccess: {
							findMany: jest.fn(),
							createMany: jest.fn(),
							deleteMany: jest.fn(),
						},
						$transaction: jest.fn().mockResolvedValue([]),
					},
				},
			],
		}).compile();

		repository = module.get<MaterialRepository>(MaterialRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it("should be defined", () => {
		expect(repository).toBeDefined();
	});

	describe("createMaterial", () => {
		const params: CreateMaterialParams = {
			courseId: 1,
			storageKey: "1/uuid-lesson5.pdf",
			originalName: "lesson5.pdf",
			mimeType: "application/pdf",
			sizeBytes: 1024,
			status: UploadStatus.UPLOADING as any,
		};

		it("should create a pending file record and return its id", async () => {
			jest.spyOn(prisma.file, "create").mockResolvedValue(mockFile as any);

			const result = await repository.createMaterial(params);

			expect(result).toBe(10);
			expect(prisma.file.create).toHaveBeenCalledWith({
				data: {
					course_id: params.courseId,
					storage_key: params.storageKey,
					original_name: params.originalName,
					mime_type: params.mimeType,
					size_bytes: params.sizeBytes,
					type: FileType.PDF,
					upload_status: params.status,
				},
			});
		});

		it("should throw BadRequestException for unsupported mime type", async () => {
			await expect(
				repository.createMaterial({ ...params, mimeType: "image/png" }),
			).rejects.toThrow(BadRequestException);
			expect(prisma.file.create).not.toHaveBeenCalled();
		});
	});

	describe("getMaterialById", () => {
		it("should return material entity", async () => {
			jest.spyOn(prisma.file, "findUnique").mockResolvedValue(mockFile as any);

			const result = await repository.getMaterialById(10);

			expect(result).toEqual({
				id: mockFile.id,
				courseId: mockFile.course_id,
				storageKey: mockFile.storage_key,
				originalName: mockFile.original_name,
				mimeType: mockFile.mime_type,
				sizeBytes: mockFile.size_bytes,
				type: mockFile.type,
				status: mockFile.upload_status,
				created_at: mockFile.created_at,
			});
			expect(prisma.file.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
		});

		it("should return null when not found", async () => {
			jest.spyOn(prisma.file, "findUnique").mockResolvedValue(null);

			const result = await repository.getMaterialById(999);

			expect(result).toBeNull();
		});
	});

	describe("getMaterialsByCourseId", () => {
		it("should return only uploaded materials for the course with teachers who have access", async () => {
			const uploadedFile = {
				...mockFile,
				upload_status: UploadStatus.UPLOADED,
				file_accesses: [
					{ teacher_id: 5, type: FileAccessType.ALLOW, teacher: { id: 5, name: "Teacher Five" } },
					{ teacher_id: 6, type: FileAccessType.ALLOW, teacher: { id: 6, name: "Teacher Six" } },
				],
			};
			jest.spyOn(prisma.file, "findMany").mockResolvedValue([uploadedFile] as any);
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([] as any);

			const result = await repository.getMaterialsByCourseId(1);

			expect(result).toEqual([
				{
					id: uploadedFile.id,
					courseId: uploadedFile.course_id,
					storageKey: uploadedFile.storage_key,
					originalName: uploadedFile.original_name,
					mimeType: uploadedFile.mime_type,
					sizeBytes: uploadedFile.size_bytes,
					type: uploadedFile.type,
					status: uploadedFile.upload_status,
					created_at: uploadedFile.created_at,
					teachers: [
						{ id: 5, name: "Teacher Five", accessSource: AccessSource.FILE },
						{ id: 6, name: "Teacher Six", accessSource: AccessSource.FILE },
					],
					restrictedTeachers: [],
				},
			]);
			expect(prisma.file.findMany).toHaveBeenCalledWith({
				where: { course_id: 1, upload_status: UploadStatus.UPLOADED },
				include: {
					file_accesses: {
						include: {
							teacher: true,
						},
					},
				},
				orderBy: { original_name: "asc" },
			});
			expect(prisma.courseAccess.findMany).toHaveBeenCalledWith({
				where: { course_id: 1 },
				include: { teacher: true },
			});
		});

		it("should mark teachers with course access and skip their duplicate personal grants", async () => {
			const uploadedFile = {
				...mockFile,
				upload_status: UploadStatus.UPLOADED,
				file_accesses: [{ teacher_id: 5, type: FileAccessType.ALLOW, teacher: { id: 5, name: "Teacher Five" } }],
			};
			jest.spyOn(prisma.file, "findMany").mockResolvedValue([uploadedFile] as any);
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([
				{ teacher_id: 5, teacher: { id: 5, name: "Teacher Five" } },
				{ teacher_id: 7, teacher: { id: 7, name: "Teacher Seven" } },
			] as any);

			const [material] = await repository.getMaterialsByCourseId(1);

			expect(material.teachers).toEqual([
				{ id: 5, name: "Teacher Five", accessSource: AccessSource.COURSE },
				{ id: 7, name: "Teacher Seven", accessSource: AccessSource.COURSE },
			]);
			expect(material.restrictedTeachers).toEqual([]);
		});

		it("should move teachers restricted for this material to restrictedTeachers", async () => {
			const uploadedFile = {
				...mockFile,
				upload_status: UploadStatus.UPLOADED,
				file_accesses: [{ teacher_id: 5, type: FileAccessType.DENY, teacher: { id: 5, name: "Teacher Five" } }],
			};
			jest.spyOn(prisma.file, "findMany").mockResolvedValue([uploadedFile] as any);
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([
				{ teacher_id: 5, teacher: { id: 5, name: "Teacher Five" } },
				{ teacher_id: 7, teacher: { id: 7, name: "Teacher Seven" } },
			] as any);

			const [material] = await repository.getMaterialsByCourseId(1);

			expect(material.teachers).toEqual([{ id: 7, name: "Teacher Seven", accessSource: AccessSource.COURSE }]);
			expect(material.restrictedTeachers).toEqual([{ id: 5, name: "Teacher Five" }]);
		});
	});

	describe("updateMaterial", () => {
		it("should update size and status", async () => {
			const params: UpdateMaterialParams = { sizeBytes: 2048, status: UploadStatus.UPLOADED as any };
			jest.spyOn(prisma.file, "update").mockResolvedValue({ ...mockFile, size_bytes: 2048, upload_status: UploadStatus.UPLOADED } as any);

			const result = await repository.updateMaterial(10, params);

			expect(result.sizeBytes).toBe(2048);
			expect(prisma.file.update).toHaveBeenCalledWith({
				where: { id: 10 },
				data: { size_bytes: 2048, upload_status: UploadStatus.UPLOADED },
			});
		});
	});

	describe("renameMaterial", () => {
		it("should update the original name and return the material with its teachers", async () => {
			jest.spyOn(prisma.file, "update").mockResolvedValue({
				...mockFile,
				original_name: "renamed.pdf",
				file_accesses: [{ teacher_id: 5, type: FileAccessType.ALLOW, teacher: { id: 5, name: "Teacher Five" } }],
			} as any);
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([] as any);

			const result = await repository.renameMaterial(10, "renamed.pdf");

			expect(result.originalName).toBe("renamed.pdf");
			expect(result.teachers).toEqual([{ id: 5, name: "Teacher Five", accessSource: AccessSource.FILE }]);
			expect(result.restrictedTeachers).toEqual([]);
			expect(prisma.file.update).toHaveBeenCalledWith({
				where: { id: 10 },
				data: { original_name: "renamed.pdf" },
				include: {
					file_accesses: {
						include: {
							teacher: true,
						},
					},
				},
			});
		});
	});

	describe("deleteMaterial", () => {
		it("should delete file access records and the file itself in a single transaction", async () => {
			const deleteManyResult = Symbol("deleteMany");
			const deleteResult = Symbol("delete");
			jest.spyOn(prisma.fileAccess, "deleteMany").mockReturnValue(deleteManyResult as any);
			jest.spyOn(prisma.file, "delete").mockReturnValue(deleteResult as any);

			await repository.deleteMaterial(10);

			expect(prisma.fileAccess.deleteMany).toHaveBeenCalledWith({ where: { file_id: 10 } });
			expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: 10 } });
			expect(prisma.$transaction).toHaveBeenCalledWith([deleteManyResult, deleteResult]);
		});
	});

	describe("hasFiles", () => {
		it("should return true when course has files", async () => {
			jest.spyOn(prisma.file, "count").mockResolvedValue(2);

			const result = await repository.hasFiles(1);

			expect(result).toBe(true);
			expect(prisma.file.count).toHaveBeenCalledWith({ where: { course_id: 1 } });
		});

		it("should return false when course has no files", async () => {
			jest.spyOn(prisma.file, "count").mockResolvedValue(0);

			const result = await repository.hasFiles(1);

			expect(result).toBe(false);
		});
	});

	describe("hasAccess", () => {
		const mockAccessLookup = (fileAccesses: unknown[], courseAccesses: unknown[]) => {
			jest.spyOn(prisma.file, "findUnique").mockResolvedValue({
				file_accesses: fileAccesses,
				course: { accesses: courseAccesses },
			} as any);
		};

		it("should return true when the teacher has a personal grant", async () => {
			mockAccessLookup([{ type: FileAccessType.ALLOW }], []);

			expect(await repository.hasAccess(5, 10)).toBe(true);
		});

		it("should return true when the teacher has access to the course", async () => {
			mockAccessLookup([], [{ id: 1 }]);

			expect(await repository.hasAccess(5, 10)).toBe(true);
		});

		it("should return false when the course access is restricted for this material", async () => {
			mockAccessLookup([{ type: FileAccessType.DENY }], [{ id: 1 }]);

			expect(await repository.hasAccess(5, 10)).toBe(false);
		});

		it("should return false when there is neither a personal grant nor course access", async () => {
			mockAccessLookup([], []);

			expect(await repository.hasAccess(5, 10)).toBe(false);
		});

		it("should return false when the material does not exist", async () => {
			jest.spyOn(prisma.file, "findUnique").mockResolvedValue(null);

			expect(await repository.hasAccess(5, 999)).toBe(false);
		});
	});

	describe("setFileAccess", () => {
		it("should replace existing records with records of the given type", async () => {
			const deleteManyResult = Symbol("deleteMany");
			const createManyResult = Symbol("createMany");
			jest.spyOn(prisma.fileAccess, "deleteMany").mockReturnValue(deleteManyResult as any);
			jest.spyOn(prisma.fileAccess, "createMany").mockReturnValue(createManyResult as any);

			await repository.setFileAccess([1, 2], 10, DomainFileAccessType.DENY);

			expect(prisma.fileAccess.deleteMany).toHaveBeenCalledWith({
				where: { teacher_id: { in: [1, 2] }, file_id: 10 },
			});
			expect(prisma.fileAccess.createMany).toHaveBeenCalledWith({
				data: [
					{ teacher_id: 1, file_id: 10, type: DomainFileAccessType.DENY },
					{ teacher_id: 2, file_id: 10, type: DomainFileAccessType.DENY },
				],
			});
			expect(prisma.$transaction).toHaveBeenCalledWith([deleteManyResult, createManyResult]);
		});

		it("should do nothing when teacher list is empty", async () => {
			await repository.setFileAccess([], 10, DomainFileAccessType.ALLOW);

			expect(prisma.$transaction).not.toHaveBeenCalled();
		});
	});

	describe("clearFileAccess", () => {
		it("should delete file access records for the given teachers and material", async () => {
			jest.spyOn(prisma.fileAccess, "deleteMany").mockResolvedValue({ count: 2 } as any);

			await repository.clearFileAccess([1, 2], 10);

			expect(prisma.fileAccess.deleteMany).toHaveBeenCalledWith({
				where: { teacher_id: { in: [1, 2] }, file_id: 10 },
			});
		});

		it("should do nothing when teacher list is empty", async () => {
			await repository.clearFileAccess([], 10);

			expect(prisma.fileAccess.deleteMany).not.toHaveBeenCalled();
		});
	});

	describe("grantCourseAccess", () => {
		it("should create course access records and reset per-material records of the course", async () => {
			const createManyResult = Symbol("createMany");
			const deleteManyResult = Symbol("deleteMany");
			jest.spyOn(prisma.courseAccess, "createMany").mockReturnValue(createManyResult as any);
			jest.spyOn(prisma.fileAccess, "deleteMany").mockReturnValue(deleteManyResult as any);

			await repository.grantCourseAccess(1, [5, 6]);

			expect(prisma.courseAccess.createMany).toHaveBeenCalledWith({
				data: [
					{ teacher_id: 5, course_id: 1 },
					{ teacher_id: 6, course_id: 1 },
				],
				skipDuplicates: true,
			});
			expect(prisma.fileAccess.deleteMany).toHaveBeenCalledWith({
				where: { teacher_id: { in: [5, 6] }, file: { course_id: 1 } },
			});
			expect(prisma.$transaction).toHaveBeenCalledWith([createManyResult, deleteManyResult]);
		});

		it("should do nothing when teacher list is empty", async () => {
			await repository.grantCourseAccess(1, []);

			expect(prisma.$transaction).not.toHaveBeenCalled();
		});
	});

	describe("revokeCourseAccess", () => {
		it("should delete course access records together with per-material records of the course", async () => {
			const courseDeleteResult = Symbol("courseDelete");
			const fileDeleteResult = Symbol("fileDelete");
			jest.spyOn(prisma.courseAccess, "deleteMany").mockReturnValue(courseDeleteResult as any);
			jest.spyOn(prisma.fileAccess, "deleteMany").mockReturnValue(fileDeleteResult as any);

			await repository.revokeCourseAccess(1, [5, 6]);

			expect(prisma.courseAccess.deleteMany).toHaveBeenCalledWith({
				where: { teacher_id: { in: [5, 6] }, course_id: 1 },
			});
			expect(prisma.fileAccess.deleteMany).toHaveBeenCalledWith({
				where: { teacher_id: { in: [5, 6] }, file: { course_id: 1 } },
			});
			expect(prisma.$transaction).toHaveBeenCalledWith([courseDeleteResult, fileDeleteResult]);
		});

		it("should do nothing when teacher list is empty", async () => {
			await repository.revokeCourseAccess(1, []);

			expect(prisma.$transaction).not.toHaveBeenCalled();
		});
	});

	describe("getCourseAccessTeachers", () => {
		it("should return teachers with course access sorted by name", async () => {
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([
				{ teacher: { id: 5, name: "Teacher Five" } },
				{ teacher: { id: 7, name: "Teacher Seven" } },
			] as any);

			const result = await repository.getCourseAccessTeachers(1);

			expect(result).toEqual([
				{ id: 5, name: "Teacher Five" },
				{ id: 7, name: "Teacher Seven" },
			]);
			expect(prisma.courseAccess.findMany).toHaveBeenCalledWith({
				where: { course_id: 1 },
				include: { teacher: true },
				orderBy: { teacher: { name: "asc" } },
			});
		});
	});

	describe("filterTeachersWithCourseAccess", () => {
		it("should return only the teachers who have access to the course", async () => {
			jest.spyOn(prisma.courseAccess, "findMany").mockResolvedValue([{ teacher_id: 5 }] as any);

			const result = await repository.filterTeachersWithCourseAccess(1, [5, 6]);

			expect(result).toEqual([5]);
			expect(prisma.courseAccess.findMany).toHaveBeenCalledWith({
				where: { course_id: 1, teacher_id: { in: [5, 6] } },
				select: { teacher_id: true },
			});
		});

		it("should return an empty list without querying when teacher list is empty", async () => {
			const result = await repository.filterTeachersWithCourseAccess(1, []);

			expect(result).toEqual([]);
			expect(prisma.courseAccess.findMany).not.toHaveBeenCalled();
		});
	});

	describe("getMaterialsSize", () => {
		it("should return the sum of uploaded materials sizes", async () => {
			jest.spyOn(prisma.file, "aggregate").mockResolvedValue({ _sum: { size_bytes: 3072 } } as any);

			const result = await repository.getMaterialsSize();

			expect(result).toBe(3072);
			expect(prisma.file.aggregate).toHaveBeenCalledWith({
				_sum: { size_bytes: true },
				where: { upload_status: UploadStatus.UPLOADED },
			});
		});

		it("should return 0 when there are no uploaded materials", async () => {
			jest.spyOn(prisma.file, "aggregate").mockResolvedValue({ _sum: { size_bytes: null } } as any);

			const result = await repository.getMaterialsSize();

			expect(result).toBe(0);
		});
	});
});
