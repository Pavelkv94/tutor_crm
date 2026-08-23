import { Test, TestingModule } from "@nestjs/testing";
import { SettingsService } from "../../../src/modules/settings/application/settings.service";
import { SettingsRepositoryPort } from "../../../src/modules/settings/application/ports/settings.repository.port";

describe("SettingsService", () => {
	let service: SettingsService;
	let repository: jest.Mocked<SettingsRepositoryPort>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SettingsService,
				{
					provide: SettingsRepositoryPort,
					useValue: {
						getSettings: jest.fn().mockResolvedValue({ eur_rate: 0, updated_at: null }),
						updateSettings: jest.fn().mockResolvedValue({ eur_rate: 500, updated_at: new Date() }),
					},
				},
			],
		}).compile();

		service = module.get(SettingsService);
		repository = module.get(SettingsRepositoryPort);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("getSettings", () => {
		it("returns the defaults when the row does not exist yet", async () => {
			await expect(service.getSettings()).resolves.toEqual({ eur_rate: 0, updated_at: null });
		});
	});

	describe("updateSettings", () => {
		it("stores the rate in hundredths", async () => {
			const result = await service.updateSettings({ eur_rate: 500 });

			expect(repository.updateSettings).toHaveBeenCalledWith({ eur_rate: 500 });
			expect(result.eur_rate).toBe(500);
		});
	});

	describe("getEurRate", () => {
		it("returns 0 when the rate has never been set — invoices then go out without a link", async () => {
			await expect(service.getEurRate()).resolves.toBe(0);
		});

		it("returns the stored rate", async () => {
			repository.getSettings.mockResolvedValue({ eur_rate: 330, updated_at: new Date() });

			await expect(service.getEurRate()).resolves.toBe(330);
		});
	});
});
