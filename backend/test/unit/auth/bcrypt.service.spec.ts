import { Test, TestingModule } from '@nestjs/testing';
import { BcryptService } from '../../../src/modules/auth/bcrypt.service';

describe('BcryptService', () => {
	let service: BcryptService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [BcryptService],
		}).compile();

		service = module.get<BcryptService>(BcryptService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generateHash', () => {
		it('should generate a valid hash', async () => {
			const password = 'testPassword123';
			const hash = await service.generateHash(password);

			expect(hash).toBeDefined();
			expect(typeof hash).toBe('string');
			expect(hash.length).toBeGreaterThan(0);
			expect(hash).not.toBe(password);
		});

		it('should generate different hashes for the same password', async () => {
			const password = 'testPassword123';
			const hash1 = await service.generateHash(password);
			const hash2 = await service.generateHash(password);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('checkPassword', () => {
		it('should return true for correct password', async () => {
			const password = 'testPassword123';
			const hash = await service.generateHash(password);
			const isValid = await service.checkPassword(password, hash);

			expect(isValid).toBe(true);
		});

		it('should return false for incorrect password', async () => {
			const password = 'testPassword123';
			const wrongPassword = 'wrongPassword';
			const hash = await service.generateHash(password);
			const isValid = await service.checkPassword(wrongPassword, hash);

			expect(isValid).toBe(false);
		});
	});
});

