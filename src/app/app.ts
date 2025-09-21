import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { BehaviorSubject } from "rxjs";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App {
	protected title = "angular20-playground";

	constructor() {
	}
}

// UI as entities.

type UiEntity =
	| { id: string; _type: 'Modal'; state: { open: boolean } }
	| { id: string; _type: 'Tab'; state: { activeIndex: number } }
	| { id: string; _type: 'Grid'; state: { selectedIds: string[] } }
	| { id: string; _type: 'Card'; state: { selectedIds: string[] } }
	| { id: string; _type: 'Timeline'; state: { cardIds: string[] } }
	| { id: string; _type: 'Swimlane'; state: { cardIds: string[] } }
	| { id: string; _type: 'Board'; state: { swimlaneIds: string[] } }
	;

type UiState = {
	entities: Record<string, UiEntity>;
}


// Example.
const myboard: UiEntity = {
	id: "my-board",
	_type: 'Board',
	state: { swimlaneIds: [ "sl1", "sl2" ] }
}

const swimlane1: UiEntity = {
	id: "sl1",
	_type: 'Swimlane',
	state: { cardIds: [] }
}
const swimlane2: UiEntity = {
	id: "sl2",
	_type: 'Swimlane',
	state: { cardIds: [] }
}
