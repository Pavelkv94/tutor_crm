import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class TasksEventsService {
	private readonly changed$ = new Subject<void>();

	readonly stream$: Observable<void> = this.changed$.asObservable();

	emitChanged(): void {
		this.changed$.next();
	}
}
