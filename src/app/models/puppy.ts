
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

// export const myRobot: Tree<TRS> = createNode<TRS>(
// 	{ id: "root", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1 },
// 	[
// 		createNode(
// 			{ id: "head-base", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1 },
// 			[
// 				createLeaf({ id: "left-ear", t: [-0.5, 5, 0], pivot: [0.0, 0.0, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 }),
// 				createLeaf({ id: "right-ear", t: [0.5, 5, 0], pivot: [0.0, 0.0, 0], rxdeg: 0, rydeg: 0, rzdeg: 25, s: 0.5 })
// 			]
// 		),
// 	]
// );

export const headGeom: Tree<TRS> = createNode<TRS>(
	{ id: "head-base", t: [0, 0.9, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.7 },
	[
		createLeaf({ id: "left-ear", t: [1.0, 1.0, 0], pivot: [-0.5, -0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 }),
		createLeaf({ id: "right-ear", t: [-1.0, 1.0, 0], pivot: [0.5, -0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 })
	]
);
export const bodyGeom: Tree<TRS> = createNode<TRS>(
	{ id: "trunk", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 },
	[
		headGeom,
		createLeaf({ id: "left-arm", t: [0.8, -0.3, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
		createLeaf({ id: "right-arm", t: [-0.8, -0.3, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
		createLeaf({ id: "left-leg", t: [0.3, -1.1, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
		createLeaf({ id: "right-leg", t: [-0.3, -1.1, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
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

export function updateWorld(tree: Tree<TRS>, parentWorld: number[] = mat.IDENT44 as number[]): Tree<TRS & { worldMatrix: number[] }> {
	const value = tree.value;
	const baseM = matFromTRS(value);
	const world = mat.mulM44([], parentWorld, baseM); // parent * baseLocal

	const updated: TRS & { worldMatrix: number[] } = { ...value, worldMatrix: world as number[] };

	if (tree.kind === "leaf") return createLeaf(updated);
	return createNode(updated, tree.children.map(ch => updateWorld(ch, world as number[])));
}
