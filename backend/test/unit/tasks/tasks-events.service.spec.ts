import { Test, TestingModule } from '@nestjs/testing';
import { take } from 'rxjs';
import { TasksEventsService } from '../../../src/modules/tasks/tasks-events.service';

describe('TasksEventsService', () => {
	let service: TasksEventsService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [TasksEventsService],
		}).compile();

		service = module.get<TasksEventsService>(TasksEventsService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('stream$', () => {
		it('should be an observable', () => {
			expect(service.stream$).toBeDefined();
			expect(typeof service.stream$.subscribe).toBe('function');
		});
	});

	describe('emitChanged', () => {
		it('should emit on stream$ when called', (done) => {
			service.stream$.pipe(take(1)).subscribe(() => {
				done();
			});

			service.emitChanged();
		});

		it('should emit each time it is called', (done) => {
			let count = 0;
			service.stream$.pipe(take(3)).subscribe({
				next: () => count++,
				complete: () => {
					expect(count).toBe(3);
					done();
				},
			});

			service.emitChanged();
			service.emitChanged();
			service.emitChanged();
		});
	});
});
