import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BehaviorSubject } from "rxjs";
import { CommonModule } from '@angular/common';

@Component({
	selector: "app-root",
	imports: [CommonModule],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App {
	protected title = "angular20-playground";

	public uiState: UiState = {
		entities: {
			"my-logbook": {
				id: `my-logbook`,
				_type: `LogBook`,
				state: {
					header: 'My Log Book',
					description: `This is a simple log book`,
					logEntryBarIds: [`my-log-entry1`, `my-log-entry2`]
				}
			},
			"my-log-entry1": {
				id: `my-log-entry1`,
				_type: `LogEntryBar`,
				state: {
					header: 'My First Log Entry',
					description: `This is a simple log entry bar`,
					timeStamp: 1
				}
			},
			"my-log-entry2": {
				id: `my-log-entry2`,
				_type: `LogEntryBar`,
				state: {
					header: 'My Second Log Entry',
					description: `This is a simple log entry bar (second)`,
					timeStamp: 2
				}
			}
		}
	};

	constructor() {
	}
}

// UI as entities.

type UiEntity =
	| { id: string; _type: 'LogEntryBar'; state: { header: string, description: string, timeStamp: number } }
	| { id: string; _type: 'LogBook';  state: { header: string, description: string, logEntryBarIds: string[] } }
	// | { id: string; _type: 'Modal'; state: { open: boolean } }
	// | { id: string; _type: 'Tab'; state: { activeIndex: number } }
	// | { id: string; _type: 'Grid'; state: { selectedIds: string[] } }
	// | { id: string; _type: 'Timeline'; state: { cardIds: string[] } }
	// | { id: string; _type: 'Swimlane'; state: { cardIds: string[] } }
	// | { id: string; _type: 'Board'; state: { swimlaneIds: string[] } }
	;

type UiState = {
	entities: Record<string, UiEntity>;
}
