
import * as mat from "@thi.ng/matrices";
import { createLeaf, createNode, mapTree, Tree } from "../ds/tree";
import { Model, unitCube } from "./unit";
import { toRadians } from "../ds/util";

const head_unit: Tree<Model> = createNode(
	unitCube("base-head"),
	[createLeaf(unitCube("left-ear")), createLeaf(unitCube("right-ear"))]
);
		// Transform: Head w/ two ears model, box composition.
		const headComposition = mapTree<Model, Model>(head_unit, (cube) => {
			if (cube.id === "left-ear" || cube.id === "right-ear") {
				const step = 0.5;
				const earsAngleDeg = 25;
				const T = mat.translation44([], [
					cube.id === "left-ear" ? step : -step, 0.25, 0.0,
				]); // identity for now.
				const Rx = mat.rotationX44([], 0);
				const Ry = mat.rotationY44([], 0);
				const Rz = mat.rotationZ44([],
					toRadians(cube.id === "left-ear" ? -earsAngleDeg : earsAngleDeg)); // tilt a bit.
				const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
				const S = mat.scale44([], 0.7);
				// M = T * Rx * Ry * Rz * S
				const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
				return <Model>{
					...cube,
					model:  mat.mulM44([], cube.model, newModel), // local transform.
				};
			}
			return cube;
		});
		// Transform: Head w/ two ears model, box composition.
const headComposition2 = mapTree<Model, Model>(headComposition, (cube) => {
	const T = mat.translation44([], [0, 0.4, 0.0]); // identity for now.
	const Rx = mat.rotationX44([], 0);
	const Ry = mat.rotationY44([], toRadians(25));
	const Rz = mat.rotationZ44([], toRadians(15)); // tilt a bit.
	const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
	const S = mat.scale44([], 0.7);
	// M = T * Rx * Ry * Rz * S
	const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
	return <Model>{
		...cube,
		model: mat.mulM44([], newModel, cube.model), // world transform.
	};
});

const body: Tree<Model> = createNode(
	unitCube("body"),
	[
		headComposition2,
		createLeaf(unitCube("left-leg")), createLeaf(unitCube("right-leg"))
	]
);

export const puppy = mapTree<Model, Model>(body, (cube) => {
	if (cube.id === "body") {
		const T = mat.translation44([], [0.0, -0.4, 0.0]); // identity for now.
		const Rx = mat.rotationX44([], 0);
		const Ry = mat.rotationY44([], 0);
		const Rz = mat.rotationZ44([], 0); // tilt a bit.
		const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
		const S = mat.scale44([], 0.85);
		// M = T * Rx * Ry * Rz * S
		const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
		return <Model>{
			...cube,
			model: newModel,
		};
	}
	if (cube.id === "left-leg" || cube.id === "right-leg") {
		const step = 0.5;
		const T = mat.translation44([], [
			cube.id === "left-leg" ? step : -step, -0.85, 0.0,
		]); // identity for now.
		const Rx = mat.rotationX44([], 0);
		const Ry = mat.rotationY44([], 0);
		const Rz = mat.rotationZ44([], 0);
		const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
		const S = mat.scale44([], 0.5);
		// M = T * Rx * Ry * Rz * S
		const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
		return <Model>{
			...cube,
			model: newModel,
		};
	}
	return cube;
});
