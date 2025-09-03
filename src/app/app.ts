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

		const appFlow: WorkFlowState = {
			steps: {
				"root": {
					id: "root",
					kind: "sequence",
					children: ["load-resources", "load-main", "load-profile"]
				},
				"load-resources": {
					id: "load-resources",
					kind: "parallel",
					children: ["load-city-lookup", "load-country-lookup" ]
				},
				"load-main": {
					id: "load-main",
					kind: "task"
				},
				"load-profile": {
					id: "load-profile",
					kind: "task"
				},
				"load-city-lookup": {
					id: "load-city-lookup",
					kind: "task"
				},
				"load-country-lookup": {
					id: "load-country-lookup",
					kind: "task"
				}
			},
			runTime: {
				"load-main": "idle",
				"load-profile": "idle",
				"load-city-lookup": "success",
				"load-country-lookup": "success"
			},
			rootId: "root"
		};

		console.log(readyTasks("root", appFlow)); // ['load-city-lookup', 'load-country-lookup']

		// Note.Try setting the statuses in the runTime, and you'll get different result.

		// Spinners?
		console.log("load resurce spinning status: ",
			aggregateStatus("load-resources", appFlow));
	}
}

type Status = "idle" | "loading" | "success" | "failed" | "skipped";

type OpLeaf = {
	id: string;
	kind: "task";
}
type OpNode = {
	id: string;
	kind: "sequence" | "parallel",
	children: string[];
}

type WorkFlowState = {
	steps: Record<string, OpLeaf | OpNode>;
	runTime: Record<string, Status>;
	rootId: string;
}

const isDone = (s: Status) => s === "success" || s === "skipped";

function aggregateStatus(id: string, wf: WorkFlowState): Status {

	const node = wf.steps[id];
	if (node.kind === "task") { return wf.runTime[id] ?? "idle" }

	const statuses = node.children.map(childId => aggregateStatus(childId, wf));

	if (statuses.some(s => s === "failed")) { return "failed"; }
	if (statuses.every(isDone)) { return "success"; }
	if (statuses.some(s => s === "loading")) { return "loading"; }
	return "idle";
}

function readyTasks(id: string, wf: WorkFlowState): string[] {
	const node = wf.steps[id];

	if (node.kind === "task") {
		return (wf.runTime[id] ?? "idle") === "idle" ? [id] : [];
	}

	if (node.children.length === 0) {
		return [];
	}

	if (node.kind === "sequence") {
		for (const child of node.children) {
			const status = aggregateStatus(child, wf);
			if (status === "failed") { return []; } // stop the sequence.
			if (!isDone(status)) { return readyTasks(child, wf); } // next unfinished.
		}
		return [];
	}

	if (node.kind === "parallel") {
		return node.children.flatMap(child => readyTasks(child, wf));
	}

	return [];
}

/*
@Injectable()
export class WorkflowEffects {
  constructor(private actions$: Actions, private store: Store, private api: ApiService) {}

  // scheduler
  schedule$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startWorkflow, taskSuccess, taskFailed),
      withLatestFrom(this.store.select(selectWorkflow)),
      mergeMap(([_, wf]) => {
        const ready = readyTasks(wf.rootId, wf)
          .filter(id => (wf.runTime[id] ?? "idle") === "idle");
        return ready.map(id => taskStart({ id }));
      })
    )
  );

  // executor
  exec$ = createEffect(() =>
    this.actions$.pipe(
      ofType(taskStart),
      mergeMap(({ id }) => {
        // mark loading
        const start = setRunTime({ id, status: "loading" });

        // pick task implementation
        switch (id) {
          case "load-entity":
            return concat(
              of(start),
              this.api.getEntity().pipe(
                map(() => {
                updateState(paylod);
                taskSuccess({ id });
                ),
                catchError(() => of(taskFailed({ id })))
              )
            );
          case "load-file":
            return concat(
              of(start),
              this.api.getFile().pipe(
                map(() => taskSuccess({ id })),
                catchError(() => of(taskFailed({ id })))
              )
            );
          default:
            return of(taskFailed({ id })); // unknown task
        }
      })
    )
  );
}


*/
