import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { MaterialRepository } from "../../../src/modules/material/infrastructure/material.repository";
import { PrismaService } from "../../../src/infrastructure/prisma/prisma.service";
import { FileType, UploadStatus } from "../../../src/infrastructure/prisma/generated/client";
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
							count: jest.fn(),
						},
						fileAccess: {
							findFirst: jest.fn(),
							createMany: jest.fn(),
						},
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
		it("should return only uploaded materials for the course ordered by newest first", async () => {
			const uploadedFile = { ...mockFile, upload_status: UploadStatus.UPLOADED };
			jest.spyOn(prisma.file, "findMany").mockResolvedValue([uploadedFile] as any);

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
				},
			]);
			expect(prisma.file.findMany).toHaveBeenCalledWith({
				where: { course_id: 1, upload_status: UploadStatus.UPLOADED },
				orderBy: { created_at: "desc" },
			});
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
		it("should return true when a file access record exists", async () => {
			jest.spyOn(prisma.fileAccess, "findFirst").mockResolvedValue({ id: 1, teacher_id: 5, file_id: 10, created_at: new Date() } as any);

			const result = await repository.hasAccess(5, 10);

			expect(result).toBe(true);
			expect(prisma.fileAccess.findFirst).toHaveBeenCalledWith({ where: { teacher_id: 5, file_id: 10 } });
		});

		it("should return false when there is no file access record", async () => {
			jest.spyOn(prisma.fileAccess, "findFirst").mockResolvedValue(null);

			const result = await repository.hasAccess(5, 10);

			expect(result).toBe(false);
		});
	});

	describe("createFileAccess", () => {
		it("should create a file access record for each teacher", async () => {
			jest.spyOn(prisma.fileAccess, "createMany").mockResolvedValue({ count: 2 } as any);

			await repository.createFileAccess([1, 2], 10);

			expect(prisma.fileAccess.createMany).toHaveBeenCalledWith({
				data: [
					{ teacher_id: 1, file_id: 10 },
					{ teacher_id: 2, file_id: 10 },
				],
				skipDuplicates: true,
			});
		});

		it("should do nothing when teacher list is empty", async () => {
			await repository.createFileAccess([], 10);

			expect(prisma.fileAccess.createMany).not.toHaveBeenCalled();
		});
	});
});
