import { Test, TestingModule } from '@nestjs/testing';
import { TeacherRepository } from '../../../src/modules/teacher/infrastructure/teacher.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { FilterTeacherQuery } from '../../../src/modules/teacher/interface/dto/requests/filter.query.dto';
import { CreateTeacherDto } from '../../../src/modules/teacher/interface/dto/requests/create-teacher.input.dto';
import { UpdateTeacherDto } from '../../../src/modules/teacher/interface/dto/requests/update-teacher.input.dto';
import { Timezone } from '../../../src/modules/teacher/interface/dto/responses/teacher.dto';
import { NotFoundException } from '@nestjs/common';

describe('TeacherRepository', () => {
	let repository: TeacherRepository;
	let prisma: PrismaService;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		password: 'hashed',
		role: 'TEACHER',
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
		telegrams: [],
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TeacherRepository,
				{
					provide: PrismaService,
					useValue: {
						teacher: {
							findUnique: jest.fn(),
							findMany: jest.fn(),
							create: jest.fn(),
							update: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<TeacherRepository>(TeacherRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('getTeacherById', () => {
		it('should return teacher dto', async () => {
			jest.spyOn(prisma.teacher, 'findUnique').mockResolvedValue(mockTeacher as any);

			const result = await repository.getTeacherById(1);

			expect(result?.id).toBe(1);
			expect(result?.name).toBe('Test User');
		});

		it('should return null when not found', async () => {
			jest.spyOn(prisma.teacher, 'findUnique').mockResolvedValue(null);

			const result = await repository.getTeacherById(999);

			expect(result).toBeNull();
		});
	});

	describe('getTeacherByLogin', () => {
		it('should return teacher by login', async () => {
			jest.spyOn(prisma.teacher, 'findUnique').mockResolvedValue(mockTeacher as any);

			const result = await repository.getTeacherByLogin('testuser');

			expect(result).toEqual(mockTeacher);
		});
	});

	describe('getTeachers', () => {
		it('should return teachers with active filter', async () => {
			jest.spyOn(prisma.teacher, 'findMany').mockResolvedValue([mockTeacher] as any);

			const result = await repository.getTeachers(FilterTeacherQuery.ACTIVE);

			expect(result).toHaveLength(1);
			expect(prisma.teacher.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { deleted_at: null } }),
			);
		});
	});

	describe('createTeacher', () => {
		it('should create teacher', async () => {
			const dto: CreateTeacherDto = {
				login: 'newuser',
				password: 'password123',
				name: 'New User',
				timezone: Timezone.BY,
			};
			jest.spyOn(prisma.teacher, 'create').mockResolvedValue(mockTeacher as any);

			const result = await repository.createTeacher(dto);

			expect(result.id).toBe(1);
		});
	});

	describe('updateTeacher', () => {
		it('should update teacher', async () => {
			const dto: UpdateTeacherDto = { name: 'Updated', timezone: Timezone.BY };
			jest.spyOn(prisma.teacher, 'findUnique').mockResolvedValue(mockTeacher as any);
			jest.spyOn(prisma.teacher, 'update').mockResolvedValue({ ...mockTeacher, name: 'Updated' } as any);

			await repository.updateTeacher(1, dto);

			expect(prisma.teacher.update).toHaveBeenCalledWith({ where: { id: 1 }, data: dto });
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(prisma.teacher, 'findUnique').mockResolvedValue(null);

			await expect(repository.updateTeacher(999, { name: 'X', timezone: Timezone.BY })).rejects.toThrow(NotFoundException);
		});
	});

	describe('deleteTeacher', () => {
		it('should soft delete teacher', async () => {
			jest.spyOn(prisma.teacher, 'update').mockResolvedValue({ ...mockTeacher, deleted_at: new Date() } as any);

			await repository.deleteTeacher(1);

			expect(prisma.teacher.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { deleted_at: expect.any(Date) },
			});
		});
	});
});
