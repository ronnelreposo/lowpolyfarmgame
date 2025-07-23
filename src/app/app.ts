import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
})
export class App {
	protected title = "angular20-playground";

	constructor() {
		console.log("Hello Ronnel!");
		const htn: HTN = {
			kind: "composite",
			goalId: "loadApp",
			requires: [],
			subtasks: [
				{
					kind: "primitive",
					taskId: "loadPage",
					requires: [],
					provides: ["pageLoaded"],
				},
				{
					kind: "primitive",
					taskId: "loadResource",
					requires: ["pageLoaded"],
					provides: ["resourceLoaded"],
				},
				{
					kind: "primitive",
					taskId: "loadImage",
					requires: ["resourceLoaded"],
					provides: ["imageLoaded"],
				},
				{
					kind: "primitive",
					taskId: "showErrorDialog",
					requires: ["resourceFailed"],
					provides: [],
				},
			],
		};

		const planResult = planInternal(htn, new Set()); // no facts yet.
		console.log(
			"1",
			planResult[0].map((t) => t.taskId),
		); // ["loadPage", "loadResource", "loadImage"]

		const plantResult2 = planInternal(htn, new Set(["pageLoaded"])); // At  least the page is loaded, plan next step.
		console.log(
			"2",
			plantResult2[0].map((t) => t.taskId),
		); // ["loadResource", "loadImage"]
	}
}

type AppState = {
	pageLoaded: false;
	// Improvement. can be encapsulated by Status data type.
	resourceLoaded: false;
	resourceFailed: false;
	imageLoaded: false;
	something?: string;
};

type World = Pick<
	AppState,
	"pageLoaded" | "resourceLoaded" | "resourceFailed" | "imageLoaded"
>;

type Fact = keyof World;

type BaseTask = {
	requires: Fact[];
};

type PrimitiveTask = BaseTask & {
	kind: "primitive";
	taskId: string;
	provides: Fact[];
};

type CompositeTask = BaseTask & {
	kind: "composite";
	goalId: string;
	subtasks: HTN[];
};

type HTN = PrimitiveTask | CompositeTask;

function plan1(htn: HTN, facts: Set<Fact>): PrimitiveTask[] {
	// Check if all requires are satisfied
	const requiresMet = htn.requires.every((fact) => facts.has(fact));
	if (!requiresMet) return [];

	if (htn.kind === "primitive") {
		// Add provides to facts (immutably)
		const newFacts = new Set(facts);
		for (const f of htn.provides) newFacts.add(f);
		return [htn]; // single primitive step
	}

	if (htn.kind === "composite") {
		// Decompose recursively
		let currentFacts = new Set(facts);
		let result: PrimitiveTask[] = [];

		for (const sub of htn.subtasks) {
			const subPlan = plan1(sub, currentFacts);
			// Simulate subtask effects
			for (const t of subPlan) {
				t.provides.forEach((f) => currentFacts.add(f));
			}
			result = result.concat(subPlan);
		}

		return result;
	}

	return [];
}
// ─────────────────────────────────────────────────────────────────────────────
// Internal pure planner: returns [steps, factsAfterAllSteps]
// ─────────────────────────────────────────────────────────────────────────────
function planInternal(
	node: HTN,
	facts: ReadonlySet<Fact>,
): [PrimitiveTask[], ReadonlySet<Fact>] {
	// 1) If node can’t run yet, skip it entirely
	if (!node.requires.every((r) => facts.has(r))) {
		return [[], facts];
	}

	// 2) If primitive, also skip if it would add nothing new
	if (node.kind === "primitive") {
		if (node.provides.every((p) => facts.has(p))) {
			return [[], facts];
		}
		const nextFacts = new Set(facts);
		node.provides.forEach((p) => nextFacts.add(p));
		return [[node], nextFacts];
	}

	// 3) Composite: fold over subtasks, threading facts and steps
	return node.subtasks.reduce<[PrimitiveTask[], ReadonlySet<Fact>]>(
		([stepsAcc, factsAcc], sub) => {
			const [subSteps, subFacts] = planInternal(sub, factsAcc);
			return [stepsAcc.concat(subSteps), subFacts];
		},
		[[], facts] as [PrimitiveTask[], ReadonlySet<Fact>],
	);
}

// Either
// - Adaptive executor
// - Recactive executor
