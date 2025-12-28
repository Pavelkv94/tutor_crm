import { Test, TestingModule } from '@nestjs/testing';
import { TeacherService } from '../../../src/modules/teacher/teacher.service';
import { TeacherRepository } from '../../../src/modules/teacher/teacher.repository';
import { BcryptService } from '../../../src/modules/auth/bcrypt.service';
import { BadRequestException } from '@nestjs/common';
import { CreateTeacherDto } from '../../../src/modules/teacher/dto/create-teacher.input.dto';
import { TeacherRole } from '@prisma/client';

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
		created_at: new Date(),
	};

	const mockTeacherOutput = {
		id: 1,
		login: 'testuser',
		name: 'Test User',
		telegram_id: null,
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
			jest.spyOn(repository, 'getTeachers').mockResolvedValue(mockTeachers);

			const result = await service.getTeachers();

			expect(result).toEqual(mockTeachers);
			expect(repository.getTeachers).toHaveBeenCalled();
		});
	});

	describe('createTeacher', () => {
		it('should create teacher successfully', async () => {
			const createTeacherDto: CreateTeacherDto = {
				login: 'newuser',
				password: 'password123',
				name: 'New User',
				telegram_id: null,
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
				telegram_id: null,
			};

			jest.spyOn(repository, 'getTeacherByLogin').mockResolvedValue(mockTeacher);

			await expect(service.createTeacher(createTeacherDto)).rejects.toThrow(BadRequestException);
			await expect(service.createTeacher(createTeacherDto)).rejects.toThrow('Teacher already exists');
			expect(bcryptService.generateHash).not.toHaveBeenCalled();
			expect(repository.createTeacher).not.toHaveBeenCalled();
		});
	});
});

