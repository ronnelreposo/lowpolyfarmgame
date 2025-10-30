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

function terrain(row: number, col: number, gap = 0.01): Tree<TRS> {
	let allTrs: TRS[] = [];
	for (let i = 0; i < row; i++) {
		for (let j = 0; j < col; j++) {
			allTrs.push(<TRS>{
				id: `terrain:${i}:${j}`,
				t: [
					(i - row / 2) * (1 + gap),
					0,
					(j - row / 2) * (1 + gap)
				],
				pivot: [0, 0, 0],
				rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1
			});
		}
	}
	return createNode<TRS>(
		{ id: "root-anchor", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1.0 },
		allTrs.map(createLeaf)
	)
}

export const terrainWidth = 10;
export const terrainHeight = 10;
export const cuberManCount = 10;
export const cuberManCubeCount = 8;
export const myworld: Tree<TRS> = createNode<TRS>(
	{ id: "root-anchor", t: [0, 0, 0], pivot: [0, 0, 0], rxdeg: 0, rydeg: 0, rzdeg: 0, s: 1.0 },
	[
		// Cuberman army!
		...Array(cuberManCount).fill(null).map((x, i) => createCuberMan(i.toString())),
		// Terrain.
		terrain(terrainWidth, terrainHeight)
	],
);
