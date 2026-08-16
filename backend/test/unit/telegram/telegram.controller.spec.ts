import { Test, TestingModule } from '@nestjs/testing';
import { TelegramController } from '../../../src/modules/telegram/interface/telegram.controller';
import { TelegramService } from '../../../src/modules/telegram/application/telegram.service';
import { TelegramLinkInputDto } from '../../../src/modules/telegram/interface/dto/requests/telegram-link.input.dto';
import { JwtPayloadDto } from '../../../src/modules/auth/dto/jwt.payload.dto';
import { TeacherRoleEnum } from '../../../src/modules/teacher/interface/dto/teacherRole';

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
		role: TeacherRoleEnum.TEACHER,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [TelegramController],
			providers: [
				{
					provide: TelegramService,
					useValue: {
						generateTelegramLink: jest.fn(),
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
});



