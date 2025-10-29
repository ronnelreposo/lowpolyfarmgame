import { createLeaf, createNode, Tree } from "../ds/tree";
import { TRS } from "./geom";

const headGeom: Tree<TRS> = createNode<TRS>(
	{ id: "head-base", t: [0, 0.9, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.7 },
	[
		createLeaf({ id: "left-ear", t: [1.0, 1.0, 0], pivot: [-0.5, -0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 }),
		createLeaf({ id: "right-ear", t: [-1.0, 1.0, 0], pivot: [0.5, -0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: -25, s: 0.5 })
	]
);

function createCuberMan(id: string) {
	return createNode<TRS>(
		{ id: `cuberman:${id}`, t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 },
		[
			headGeom,
			createLeaf({ id: "left-arm", t: [0.8, -0.3, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
			createLeaf({ id: "right-arm", t: [-0.8, -0.3, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
			createLeaf({ id: "left-leg", t: [0.3, -1.1, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
			createLeaf({ id: "right-leg", t: [-0.3, -1.1, 0], pivot: [0.0, 0.5, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 0.5 }),
		]
	);
}

export const myworld: Tree<TRS> = createNode<TRS>(
	{ id: "root-anchor", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1.0 },
	// Array(3).map((_, i) => createCuberMan(i.toString())),
	Array(30).fill(null).map((x, i) => createCuberMan(i.toString())),
);
