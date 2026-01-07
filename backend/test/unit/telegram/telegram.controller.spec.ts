import { Test, TestingModule } from '@nestjs/testing';
import { TelegramController } from '../../../src/modules/telegram/telegram.controller';
import { TelegramService } from '../../../src/modules/telegram/telegram.service';
import { TelegramLinkInputDto } from '../../../src/modules/telegram/dto/telegram-link.input.dto';
import { LessonsCostFiltersDto } from '../../../src/modules/telegram/dto/lessons-cost-filter.input.dto';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRole } from '@prisma/client';

describe('TelegramController', () => {
	let controller: TelegramController;
	let service: TelegramService;

	const mockTelegramLinkOutput = {
		link: 'https://t.me/test_bot?start=test-token-uuid',
	};

	const mockTeacherPayload: JwtPayloadDto = {
		id: '1',
		login: 'testuser',
		name: 'Test Teacher',
		role: TeacherRole.TEACHER,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TelegramController],
			providers: [
				{
					provide: TelegramService,
					useValue: {
						generateTelegramLink: jest.fn(),
						sendLessonsCostToAdmin: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<TelegramController>(TelegramController);
		service = module.get<TelegramService>(TelegramService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('generateTelegramLink', () => {
		it('should generate telegram link', async () => {
			const dto: TelegramLinkInputDto = {
				teacher_id: 1,
				student_id: null,
			};

			jest.spyOn(service, 'generateTelegramLink').mockResolvedValue(mockTelegramLinkOutput);

			const result = await controller.generateTelegramLink(dto);

			expect(result).toEqual(mockTelegramLinkOutput);
			expect(service.generateTelegramLink).toHaveBeenCalledWith(dto);
		});
	});

	describe('sendLessonsCostToAdmin', () => {
		it('should send lessons cost to admin', async () => {
			const dto: LessonsCostFiltersDto = {
				student_id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
			};

			jest.spyOn(service, 'sendLessonsCostToAdmin').mockResolvedValue(undefined);

			await controller.sendLessonsCostToAdmin(dto, mockTeacherPayload);

			expect(service.sendLessonsCostToAdmin).toHaveBeenCalledWith(dto, mockTeacherPayload);
		});
	});
});



