import { Test, TestingModule } from '@nestjs/testing';
import { TeacherService } from '../../../src/modules/teacher/teacher.service';
import { TeacherRepository } from '../../../src/modules/teacher/teacher.repository';
import { BcryptService } from '../../../src/modules/auth/bcrypt.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTeacherDto } from '../../../src/modules/teacher/dto/create-teacher.input.dto';
import { UpdateTeacherDto } from '../../../src/modules/teacher/dto/update-teacher.input.dto';
import { TeacherRole } from '@prisma/client';
import { Timezone } from '../../../src/modules/teacher/dto/teacher.output.dto';
import { FilterTeacherQuery } from '../../../src/modules/teacher/dto/filter.query.dto';

describe('TeacherService', () => {
	let service: TeacherService;
	let repository: TeacherRepository;
	let bcryptService: BcryptService;

	const mockTeacher = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		password: 'hashedPassword',
		role: TeacherRole.TEACHER,
		telegram_id: null,
		telegram_link: null,
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
	};

	const mockTeacherOutput = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		telegram_id: null,
		telegram_link: null,
		timezone: Timezone.BY,
		deleted_at: null,
		created_at: new Date(),
		role: TeacherRole.TEACHER,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TeacherService,
				{
					provide: TeacherRepository,
					useValue: {
						getTeacherById: jest.fn(),
						getTeacherByLogin: jest.fn(),
						getTeachers: jest.fn(),
						createTeacher: jest.fn(),
						updateTeacher: jest.fn(),
						deleteTeacher: jest.fn(),
					},
				},
				{
					provide: BcryptService,
					useValue: {
						generateHash: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<TeacherService>(TeacherService);
		repository = module.get<TeacherRepository>(TeacherRepository);
		bcryptService = module.get<BcryptService>(BcryptService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getTeacherById', () => {
		it('should return teacher by ID', async () => {
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(mockTeacherOutput);

			const result = await service.getTeacherById(1);

			expect(result).toEqual(mockTeacherOutput);
			expect(repository.getTeacherById).toHaveBeenCalledWith(1);
		});
	});

	describe('getTeacherByLogin', () => {
		it('should return teacher by login', async () => {
			jest.spyOn(repository, 'getTeacherByLogin').mockResolvedValue(mockTeacher);

			const result = await service.getTeacherByLogin('testuser');

			expect(result).toEqual(mockTeacher);
			expect(repository.getTeacherByLogin).toHaveBeenCalledWith('testuser');
		});
	});

	describe('getTeachers', () => {
		it('should return all teachers', async () => {
			const mockTeachers = [mockTeacherOutput];
			const filter = FilterTeacherQuery.ALL;
			jest.spyOn(repository, 'getTeachers').mockResolvedValue(mockTeachers);

			const result = await service.getTeachers(filter);

			expect(result).toEqual(mockTeachers);
			expect(repository.getTeachers).toHaveBeenCalledWith(filter);
		});
	});

	describe('createTeacher', () => {
		it('should create teacher successfully', async () => {
			const createTeacherDto: CreateTeacherDto = {
				login: 'newuser',
				password: 'password123',
				name: 'New User',
				telegram_link: null,
				timezone: Timezone.BY,
			};

			const hashedPassword = 'hashedPassword123';
			const createdTeacher = { ...mockTeacherOutput, login: 'newuser', name: 'New User' };

			jest.spyOn(repository, 'getTeacherByLogin').mockResolvedValue(null);
			jest.spyOn(bcryptService, 'generateHash').mockResolvedValue(hashedPassword);
			jest.spyOn(repository, 'createTeacher').mockResolvedValue(createdTeacher);

			const result = await service.createTeacher(createTeacherDto);

			expect(result).toEqual(createdTeacher);
			expect(repository.getTeacherByLogin).toHaveBeenCalledWith(createTeacherDto.login);
			expect(bcryptService.generateHash).toHaveBeenCalledWith(createTeacherDto.password);
			expect(repository.createTeacher).toHaveBeenCalledWith({
				...createTeacherDto,
				password: hashedPassword,
			});
		});

		it('should throw BadRequestException if teacher exists', async () => {
			const createTeacherDto: CreateTeacherDto = {
				login: 'existinguser',
				password: 'password123',
				name: 'Existing User',
				telegram_link: null,
				timezone: Timezone.BY,
			};

			jest.spyOn(repository, 'getTeacherByLogin').mockResolvedValue(mockTeacher);

			await expect(service.createTeacher(createTeacherDto)).rejects.toThrow(BadRequestException);
			await expect(service.createTeacher(createTeacherDto)).rejects.toThrow('Teacher already exists');
			expect(bcryptService.generateHash).not.toHaveBeenCalled();
			expect(repository.createTeacher).not.toHaveBeenCalled();
		});
	});

	describe('updateTeacher', () => {
		const updateTeacherDto: UpdateTeacherDto = {
			name: 'Updated Teacher',
			telegram_link: 'https://t.me/updated',
			timezone: Timezone.BY,
		};

		it('should update teacher successfully', async () => {
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(mockTeacherOutput);
			jest.spyOn(repository, 'updateTeacher').mockResolvedValue(undefined);

			await service.updateTeacher(1, updateTeacherDto);

			expect(repository.getTeacherById).toHaveBeenCalledWith(1);
			expect(repository.updateTeacher).toHaveBeenCalledWith(1, updateTeacherDto);
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(null);

			await expect(service.updateTeacher(1, updateTeacherDto)).rejects.toThrow(NotFoundException);
			await expect(service.updateTeacher(1, updateTeacherDto)).rejects.toThrow('Teacher not found');
		});

		it('should throw BadRequestException if teacher is deleted', async () => {
			const deletedTeacher = {
				...mockTeacherOutput,
				deleted_at: new Date(),
			};
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(deletedTeacher as any);

			await expect(service.updateTeacher(1, updateTeacherDto)).rejects.toThrow(BadRequestException);
			await expect(service.updateTeacher(1, updateTeacherDto)).rejects.toThrow('Teacher is deleted');
		});
	});

	describe('deleteTeacher', () => {
		it('should delete teacher successfully', async () => {
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(mockTeacherOutput);
			jest.spyOn(repository, 'deleteTeacher').mockResolvedValue(undefined);

			await service.deleteTeacher(1);

			expect(repository.getTeacherById).toHaveBeenCalledWith(1);
			expect(repository.deleteTeacher).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(null);

			await expect(service.deleteTeacher(1)).rejects.toThrow(NotFoundException);
			await expect(service.deleteTeacher(1)).rejects.toThrow('Teacher not found');
		});

		it('should throw BadRequestException if teacher already deleted', async () => {
			const deletedTeacher = {
				...mockTeacherOutput,
				deleted_at: new Date(),
			};
			jest.spyOn(repository, 'getTeacherById').mockResolvedValue(deletedTeacher as any);

			await expect(service.deleteTeacher(1)).rejects.toThrow(BadRequestException);
			await expect(service.deleteTeacher(1)).rejects.toThrow('Teacher already deleted');
		});
	});
});

