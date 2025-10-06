import { TestBed } from "@angular/core/testing";
import { App } from "./app";

describe("App", () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [App],
		}).compileComponents();
	});

	it("should create the app", () => {
		const fixture = TestBed.createComponent(App);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();
	});

	// // example dom.
	// it("should render title", () => {
	// 	const fixture = TestBed.createComponent(App);
	// 	fixture.detectChanges();
	// 	const compiled = fixture.nativeElement as HTMLElement;
	// 	expect(compiled.querySelector("h1")?.textContent).toContain(
	// 		"Hello, angular20-playground",
	// 	);
	// });

	it("should compute.", () => {
		const fixture = TestBed.createComponent(App);
		const app = fixture.componentInstance;
		// initial answer.
		expect(app.answer).toEqual(0);
		// try to compute.
		app.compute();
		expect(app.answer).toEqual(1);
	});

	it("should compute and bind.", () => {
		const fixture = TestBed.createComponent(App);
		const app = fixture.componentInstance;
		// initial answer.
		expect(app.answer).toEqual(0);
		// try to compute.
		app.compute();
		fixture.detectChanges();
		const compiled = fixture.nativeElement as HTMLElement;
		expect(+(compiled.querySelector('#answer')?.textContent ?? 0)).toEqual(1);
	});
});
