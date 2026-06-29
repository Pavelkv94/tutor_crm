import { Test, TestingModule } from '@nestjs/testing';
import { StudentRepository } from '../../../src/modules/student/infrastructure/student.repository';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { FilterStudentQuery } from '../../../src/modules/student/interface/dto/requests/filter.query.dto';
import { CreateStudentDto } from '../../../src/modules/student/interface/dto/requests/create-student.dto';
import { UpdateStudentDto } from '../../../src/modules/student/interface/dto/requests/update-student.dto';

describe('StudentRepository', () => {
	let repository: StudentRepository;
	let prisma: PrismaService;

	const mockStudent = {
		id: 1,
		name: 'Test Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
		teacher_id: 1,
		balance: 0,
		bookUntilCancellation: false,
		notifyAboutBirthday: false,
		notifyAboutLessons: false,
		deleted_at: null,
		timezone: 'BY',
		created_at: new Date(),
		telegrams: [],
		lessons: [],
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StudentRepository,
				{
					provide: PrismaService,
					useValue: {
						student: {
							create: jest.fn(),
							findMany: jest.fn(),
							findUnique: jest.fn(),
							update: jest.fn(),
						},
						plan: {
							findMany: jest.fn(),
						},
					},
				},
			],
		}).compile();

		repository = module.get<StudentRepository>(StudentRepository);
		prisma = module.get<PrismaService>(PrismaService);
	});

	it('should be defined', () => {
		expect(repository).toBeDefined();
	});

	describe('create', () => {
		it('should create student', async () => {
			const dto: CreateStudentDto = {
				name: 'New Student',
				class: 5,
				birth_date: new Date('2010-01-15'),
				teacher_id: 1,
				timezone: 'BY' as any,
			};
			jest.spyOn(prisma.student, 'create').mockResolvedValue(mockStudent as any);

			const result = await repository.create(dto);

			expect(result.name).toBe('Test Student');
			expect(prisma.student.create).toHaveBeenCalled();
		});
	});

	describe('getStudentsByTeacherId', () => {
		it('should return students for teacher with active filter', async () => {
			jest.spyOn(prisma.student, 'findMany').mockResolvedValue([mockStudent] as any);

			const result = await repository.getStudentsByTeacherId(1, FilterStudentQuery.ACTIVE);

			expect(result).toHaveLength(1);
			expect(prisma.student.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { deleted_at: null, teacher_id: 1 },
				}),
			);
		});
	});

	describe('getStudent', () => {
		it('should return extended student with plans', async () => {
			jest.spyOn(prisma.student, 'findUnique').mockResolvedValue(mockStudent as any);
			jest.spyOn(prisma.plan, 'findMany').mockResolvedValue([]);

			const result = await repository.getStudent(1);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(1);
		});

		it('should return null when not found', async () => {
			jest.spyOn(prisma.student, 'findUnique').mockResolvedValue(null);
			jest.spyOn(prisma.plan, 'findMany').mockResolvedValue([]);

			const result = await repository.getStudent(999);

			expect(result).toBeNull();
		});
	});

	describe('updateStudent', () => {
		it('should update student and return true', async () => {
			const dto: UpdateStudentDto = { name: 'Updated', class: 6, birth_date: new Date('2010-01-15') };
			jest.spyOn(prisma.student, 'update').mockResolvedValue({ ...mockStudent, name: 'Updated' } as any);

			const result = await repository.updateStudent(1, dto);

			expect(result).toBe(true);
		});
	});

	describe('deleteStudent', () => {
		it('should soft delete student', async () => {
			jest.spyOn(prisma.student, 'update').mockResolvedValue({ ...mockStudent, deleted_at: new Date() } as any);

			const result = await repository.deleteStudent(1);

			expect(result).toBe(true);
			expect(prisma.student.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: { deleted_at: expect.any(Date) },
			});
		});
	});
});
