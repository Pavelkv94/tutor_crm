import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from '../../../src/modules/student/application/student.service';
import { StudentRepository } from '../../../src/modules/student/infrastructure/student.repository';
import { TeacherService } from '../../../src/modules/teacher/application/teacher.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateStudentDto } from '../../../src/modules/student/interface/dto/requests/create-student.dto';
import { UpdateStudentDto } from '../../../src/modules/student/interface/dto/requests/update-student.dto';
import { FilterStudentQuery } from '../../../src/modules/student/interface/dto/requests/filter.query.dto';

describe('StudentService', () => {
	let service: StudentService;
	let repository: StudentRepository;
	let teacherService: TeacherService;

	const mockTeacher = {
		id: 1,
		login: 'testteacher',
		name: 'Test Teacher',
		role: 'TEACHER',
		telegram_id: null,
		deleted_at: null,
	};

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
	};

	const mockStudentOutput = {
		id: 1,
		name: 'Test Student',
		class: 5,
		birth_date: new Date('2010-01-15'),
		teacher_id: 1,
		balance: 0,
		marketing_consent: false,
		balance_currency: null,
		bookUntilCancellation: false,
		notifyAboutBirthday: false,
		notifyAboutLessons: false,
	};

	const mockStudentExtended = {
		...mockStudentOutput,
		teacher: mockTeacher,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StudentService,
				{
					provide: StudentRepository,
					useValue: {
						create: jest.fn(),
						getStudentsByTeacherId: jest.fn(),
						getStudent: jest.fn(),
						updateStudent: jest.fn(),
						applyCheckoutConsents: jest.fn(),
						deleteStudent: jest.fn(),
					},
				},
				{
					provide: TeacherService,
					useValue: {
						getTeacherById: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<StudentService>(StudentService);
		repository = module.get<StudentRepository>(StudentRepository);
		teacherService = module.get<TeacherService>(TeacherService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('create', () => {
		const createStudentDto: CreateStudentDto = {
			name: 'New Student',
			class: 5,
			birth_date: new Date('2010-01-15'),
			teacher_id: 1,
			timezone: 'BY' as any,
		};

		it('should create student successfully', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(mockTeacher as any);
			jest.spyOn(repository, 'create').mockResolvedValue(mockStudentOutput as any);

			const result = await service.create(createStudentDto);

			expect(result).toEqual(mockStudentOutput);
			expect(teacherService.getTeacherById).toHaveBeenCalledWith(createStudentDto.teacher_id);
			expect(repository.create).toHaveBeenCalledWith(createStudentDto);
		});

		it('should throw NotFoundException if teacher not found', async () => {
			jest.spyOn(teacherService, 'getTeacherById').mockResolvedValue(null);

			await expect(service.create(createStudentDto)).rejects.toThrow(NotFoundException);
			await expect(service.create(createStudentDto)).rejects.toThrow('Преподаватель не найден');
		});
	});

	describe('findAllForCurrentTeacher', () => {
		it('should return students for teacher', async () => {
			const teacherId = 1;
			const filter = FilterStudentQuery.ALL;
			const mockStudents = [mockStudentOutput];

			jest.spyOn(repository, 'getStudentsByTeacherId').mockResolvedValue(mockStudents as any);

			const result = await service.findAllForCurrentTeacher(teacherId, filter);

			expect(result).toEqual(mockStudents);
			expect(repository.getStudentsByTeacherId).toHaveBeenCalledWith(teacherId, filter);
		});
	});

	describe('findById', () => {
		it('should return student by id', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(mockStudentExtended as any);

			const result = await service.findById(1);

			expect(result).toEqual(mockStudentExtended);
			expect(repository.getStudent).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(null);

			await expect(service.findById(1)).rejects.toThrow(NotFoundException);
			await expect(service.findById(1)).rejects.toThrow('Студент не найден');
		});
	});

	describe('update', () => {
		const updateStudentDto: UpdateStudentDto = {
			name: 'Updated Student',
			class: 6,
			birth_date: new Date('2010-01-15'),
		};

		it('should update student successfully', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(mockStudentExtended as any);
			jest.spyOn(repository, 'updateStudent').mockResolvedValue(true);

			await service.update(1, updateStudentDto);

			expect(repository.getStudent).toHaveBeenCalledWith(1);
			expect(repository.updateStudent).toHaveBeenCalledWith(1, updateStudentDto);
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(null);

			await expect(service.update(1, updateStudentDto)).rejects.toThrow(NotFoundException);
			await expect(service.update(1, updateStudentDto)).rejects.toThrow('Студент не найден');
		});

		it('should throw BadRequestException if student is deleted', async () => {
			const deletedStudent = {
				...mockStudentExtended,
				deleted_at: new Date(),
			};
			jest.spyOn(repository, 'getStudent').mockResolvedValue(deletedStudent as any);

			await expect(service.update(1, updateStudentDto)).rejects.toThrow(BadRequestException);
			await expect(service.update(1, updateStudentDto)).rejects.toThrow('Студент уже удален');
		});

		it('should throw NotFoundException if update fails', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(mockStudentExtended as any);
			jest.spyOn(repository, 'updateStudent').mockResolvedValue(false);

			await expect(service.update(1, updateStudentDto)).rejects.toThrow(NotFoundException);
			await expect(service.update(1, updateStudentDto)).rejects.toThrow('Студент не найден');
		});
	});

	describe('согласия ученика', () => {
		const updateWith = async (stored: Record<string, unknown>, dto: UpdateStudentDto) => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue({ ...mockStudentExtended, ...stored } as any);
			jest.spyOn(repository, 'updateStudent').mockResolvedValue(true);
			await service.update(1, dto);
			return (repository.updateStudent as jest.Mock).mock.calls[0][1];
		};

		it('проставляет дату, когда админ меняет ответ про маркетинг', async () => {
			const payload = await updateWith({ marketing_consent: false }, { marketing_consent: true });

			expect(payload).toEqual({ marketing_consent: true, marketing_consent_at: expect.any(Date) });
		});

		it('не двигает дату, когда значение не изменилось', async () => {
			// Форма редактирования шлёт поле при каждом сохранении: безусловный штамп закрыл бы
			// вопрос у всех, кого просто открыли и сохранили, и дропдаун не показался бы никогда.
			const payload = await updateWith({ marketing_consent: false }, { marketing_consent: false });

			expect(payload).toEqual({ marketing_consent: false });
		});

		it('фиксирует принятие условий', async () => {
			const payload = await updateWith({ terms_accepted: false }, { terms_accepted: true });

			expect(payload).toEqual({ terms_accepted_at: expect.any(Date) });
		});

		it('сохраняет исходный момент принятия при повторном сохранении', async () => {
			const payload = await updateWith({ terms_accepted: true }, { terms_accepted: true });

			expect(payload).toEqual({});
		});

		it('обнуляет дату, когда админ снимает принятие условий', async () => {
			// Ученик снова увидит галочку на следующей оплате.
			const payload = await updateWith({ terms_accepted: true }, { terms_accepted: false });

			expect(payload).toEqual({ terms_accepted_at: null });
		});

		it('не трогает согласия, когда их нет в запросе', async () => {
			const payload = await updateWith({}, { name: 'Новое имя' });

			expect(payload).toEqual({ name: 'Новое имя' });
		});

		it('передаёт ответы со страницы оплаты в репозиторий', async () => {
			jest.spyOn(repository, 'applyCheckoutConsents').mockResolvedValue(undefined);

			await service.recordConsentsFromCheckout(1, { termsAccepted: true, marketingConsent: false });

			expect(repository.applyCheckoutConsents).toHaveBeenCalledWith(1, { termsAccepted: true, marketingConsent: false }, expect.any(Date));
		});
	});

	describe('remove', () => {
		it('should delete student successfully', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(mockStudentExtended as any);
			jest.spyOn(repository, 'deleteStudent').mockResolvedValue(true);

			await service.remove(1);

			expect(repository.getStudent).toHaveBeenCalledWith(1);
			expect(repository.deleteStudent).toHaveBeenCalledWith(1);
		});

		it('should throw NotFoundException if student not found', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(null);

			await expect(service.remove(1)).rejects.toThrow(NotFoundException);
			await expect(service.remove(1)).rejects.toThrow('Студент не найден');
		});

		it('should throw BadRequestException if student is deleted', async () => {
			const deletedStudent = {
				...mockStudentExtended,
				deleted_at: new Date(),
			};
			jest.spyOn(repository, 'getStudent').mockResolvedValue(deletedStudent as any);

			await expect(service.remove(1)).rejects.toThrow(BadRequestException);
			await expect(service.remove(1)).rejects.toThrow('Студент уже удален');
		});

		it('should throw NotFoundException if delete fails', async () => {
			jest.spyOn(repository, 'getStudent').mockResolvedValue(mockStudentExtended as any);
			jest.spyOn(repository, 'deleteStudent').mockResolvedValue(false);

			await expect(service.remove(1)).rejects.toThrow(NotFoundException);
			await expect(service.remove(1)).rejects.toThrow('Студент не найден');
		});
	});
});

