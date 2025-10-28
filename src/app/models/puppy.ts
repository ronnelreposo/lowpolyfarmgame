
import * as mat from "@thi.ng/matrices";
import { createLeaf, createNode, mapTree, Tree } from "../ds/tree";
import { Mesh, unitCube } from "./unit";
import { toRadians } from "../ds/util";

type TRS = {
	id: string, // temporary
	t: number[],
	pivot: number[],
	rxdeg: number,
	rydeg: number,
	rzdeg: number,
	s: number,
}

const myRobot: Tree<TRS> = createNode<TRS>(
	{ id: "root", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1 },
	[
		createNode(
			{ id: "head-base", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1 },
			[
				createLeaf({ id: "left-ear", t: [-0.5, 5, 0], pivot: [0.0, 0.0, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 }),
				createLeaf({ id: "right-ear", t: [0.5, 5, 0], pivot: [0.0, 0.0, 0], rxdeg: 0, rydeg: 0, rzdeg: 25, s: 0.5 })
			]
		),
	]
);

function matFromTRS({ t, pivot, rxdeg, rydeg, rzdeg, s }: TRS): number[] {
	const T = mat.translation44([], t);
	const P = mat.translation44([], pivot);
	const nP = mat.translation44([], pivot.map(p => -1 * p));
	const Rx = mat.rotationX44([], toRadians(rxdeg));
	const Ry = mat.rotationY44([], toRadians(rydeg));
	const Rz = mat.rotationZ44([], toRadians(rzdeg));
	const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
	const S = mat.scale44([], s);
	return mat.mulM44([], T, mat.mulM44([], P,  mat.mulM44([], R, mat.mulM44([], S, nP)))) as number[]; // T*(P*R*S*-P)
}

export function updateWorld(tree: Tree<TRS>, parentWorld: number[] = mat.IDENT44 as number[]): Tree<TRS> {
	const value = tree.value;
	const baseM = matFromTRS(value);
	const world = mat.mulM44([], parentWorld, baseM); // parent * baseLocal

	const updated = { ...value, worldMatrix: world };

	if (tree.kind === "leaf") return createLeaf(updated);
	return createNode(updated, tree.children.map(ch => updateWorld(ch, world as number[])));
}



const head_unit: Tree<Mesh> = createNode(
	unitCube("base-head"),
	[createLeaf(unitCube("left-ear")), createLeaf(unitCube("right-ear"))]
);
		// Transform: Head w/ two ears model, box composition.
		const headComposition = mapTree<Mesh, Mesh>(head_unit, (cube) => {
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
				return <Mesh>{
					...cube,
					worldMatrix:  mat.mulM44([], cube.worldMatrix, newModel), // local transform.
				};
			}
			return cube;
		});
		// Transform: Head w/ two ears model, box composition.
const headComposition2 = mapTree<Mesh, Mesh>(headComposition, (cube) => {
	const T = mat.translation44([], [0, 0.4, 0.0]); // identity for now.
	const Rx = mat.rotationX44([], 0);
	const Ry = mat.rotationY44([], toRadians(25));
	const Rz = mat.rotationZ44([], toRadians(15)); // tilt a bit.
	const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
	const S = mat.scale44([], 0.7);
	// M = T * Rx * Ry * Rz * S
	const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
	return <Mesh>{
		...cube,
		worldMatrix: mat.mulM44([], newModel, cube.worldMatrix), // world transform.
	};
});

const body: Tree<Mesh> = createNode(
	unitCube("body"),
	[
		headComposition2,
		createLeaf(unitCube("left-leg")), createLeaf(unitCube("right-leg"))
	]
);

export const puppy = mapTree<Mesh, Mesh>(body, (cube) => {
	if (cube.id === "body") {
		const T = mat.translation44([], [0.0, -0.4, 0.0]); // identity for now.
		const Rx = mat.rotationX44([], 0);
		const Ry = mat.rotationY44([], 0);
		const Rz = mat.rotationZ44([], 0); // tilt a bit.
		const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
		const S = mat.scale44([], 0.85);
		// M = T * Rx * Ry * Rz * S
		const newModel = mat.mulM44([], T, mat.mulM44([], R, S));
		return <Mesh>{
			...cube,
			worldMatrix: newModel,
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
		return <Mesh>{
			...cube,
			worldMatrix: newModel,
		};
	}
	return cube;
});
