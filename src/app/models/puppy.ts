import { createLeaf, createNode, Tree } from "../ds/tree";
import { rgbaToColor } from "../ds/util";
import { Model, unitCube } from "./unit";

const headGeom: Tree<Model> = createNode<Model>(
	{
		id: "head-base",
		mesh: unitCube("unit-cube"),
		trs: {
			t: [0, 0.9, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 0.7,
		},
		// To be filled by update world.
		modelMatrix: [],
		material: { basecolor: [] },
	},
	[
		createLeaf({
			id: "left-ear",
			mesh: unitCube("unit-cube"),
			trs: {
				t: [1.0, 1.0, 0],
				pivot: [-0.5, -0.5, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: -25,
				s: 0.5,
			},
			// To be filled by update world.
			modelMatrix: [],
			material: { basecolor: [] },
		}),
		createLeaf({
			id: "head-base",
			mesh: unitCube("unit-cube"),
			trs: {
				id: "right-ear",
				t: [-1.0, 1.0, 0],
				pivot: [0.5, -0.5, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: -25,
				s: 0.5,
			},
			// To be filled by update world.
			modelMatrix: [],
			material: { basecolor: [] },
		}),
	],
);

function createCuberMan(id: string) {
	return createNode<Model>(
		{
			id: `cuberman:${id}`,
			mesh: unitCube("unit-cube"),
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 0.5,
			},
			modelMatrix: [],
			material: { basecolor: [] },
		},
		[
			headGeom,
			createLeaf({
				id: "left-arm",
				mesh: unitCube("unit-cube"),
				modelMatrix: [],
				material: { basecolor: [] },
				trs: {
					t: [0.8, -0.3, 0],
					pivot: [0.0, 0.5, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
			}),
			createLeaf({
				id: "right-arm",
				mesh: unitCube("unit-cube"),
				modelMatrix: [],
				material: { basecolor: [] },
				trs: {
					t: [-0.8, -0.3, 0],
					pivot: [0.0, 0.5, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
			}),
			createLeaf({
				id: "left-leg",
				mesh: unitCube("unit-cube"),
				modelMatrix: [],
				material: { basecolor: [] },
				trs: {
					t: [0.3, -1.1, 0],
					pivot: [0.0, 0.5, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
			}),
			createLeaf({
				id: "right-leg",
				mesh: unitCube("unit-cube"),
				modelMatrix: [],
				material: { basecolor: [] },
				trs: {
					t: [-0.3, -1.1, 0],
					pivot: [0.0, 0.5, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
			}),
		],
	);
}

function terrain(row: number, col: number, gap = 0.01): Tree<Model> {
	let spanModels: Model[] = [];
	for (let i = 0; i < row; i++) {
		for (let j = 0; j < col; j++) {
			spanModels.push(<Model>{
				id: `terrain:${i}:${j}`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [
						(i - row / 2) * (1 + gap),
						0,
						(j - row / 2) * (1 + gap),
					],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				},
				modelMatrix: [],
				material: { basecolor: [] },
			});
		}
	}
	return createNode<Model>(
		{
			id: `root-anchor`,
			mesh: unitCube("unit-cube"),
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1.0,
			},
			modelMatrix: [],
			material: { basecolor: [] },
		},
		spanModels.map(createLeaf),
	);
}

// Got limit trerain. 35x35.

export const terrainWidth = 0;
export const terrainHeight = 0;
export const cuberManCount = 0;

export const cuberManCubeCount = 8;

const carrotOffset = 1.0;
const carrotBodyHeight = 0.5 + 0.7 + 0.4 + carrotOffset;
const carrotStalkAndLeavesColors = [
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(39, 174, 96))
		.flat(), // nephritis
];
const carrotBodyColors = [
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(),
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(), // carrot
	...Array(6)
		.fill(rgbaToColor(243, 156, 18))
		.flat(),
];
// Bare no colors and not placed in the world yet.
export const myModelWorld: Tree<Model> = createNode<Model>(
	{
		id: "root-anchor",
		mesh: unitCube("unit-cube"),
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1.0,
		},
		// To be filled by update world.
		modelMatrix: [],
		material: { basecolor: [] },
	},
	[
		// Cuberman army!
		...Array(cuberManCount)
			.fill(null)
			.map((x, i) => createCuberMan(i.toString())),
		// Terrain.
		terrain(terrainWidth, terrainHeight),

		// carrot.
		createNode(
			{
				id: "root-anchor",
				mesh: unitCube("unit-cube"),
				trs: {
					t: [0, 0, 0],
					pivot: [0, 1, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
				// To be filled by update world.
				modelMatrix: [],
				material: { basecolor: [] },
			},
			[
				createLeaf({
					id: "carrot-body1",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [0, 0.2 + carrotOffset, 0],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					}, // 0.4
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotBodyColors },
				}),
				createLeaf({
					id: "carrot-body2",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [0, 0.35 + 0.4 + carrotOffset, 0],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.7,
					}, // 0.7
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotBodyColors },
				}),
				createLeaf({
					id: "carrot-body3",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [0, carrotBodyHeight, 0],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 1.0,
					}, // 1.
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotBodyColors },
				}),
				// Carrot leaves.
				createLeaf({
					id: "carrot-stalk",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [
							0,
							0.7 + // (size/2) + (prev cube size / 2).
								carrotBodyHeight,
							0,
						],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					},
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotStalkAndLeavesColors },
				}),
				createLeaf({
					id: "carrot-leaf1",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [
							0,
							0.2 + 0.7 + carrotBodyHeight, // (size/2) + (prev cube size / 2).
							0.4, // offset a bit.
						],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					},
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotStalkAndLeavesColors },
				}),
				createLeaf({
					id: "carrot-leaf2",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [
							0.4, // offset a bit.
							0.2 + 0.7 + carrotBodyHeight, // (size/2) + (leaf base size / 2).
							0,
						],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					},
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotStalkAndLeavesColors },
				}),
				createLeaf({
					id: "carrot-leaf3",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [
							-0.4, // offset a bit.
							0.2 + 0.7 + carrotBodyHeight, // (size/2) + (leaf base size / 2).
							0,
						],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					},
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotStalkAndLeavesColors },
				}),
				createLeaf({
					id: "carrot-leaf4",
					mesh: unitCube("unit-cube"),
					trs: {
						t: [
							0,
							0.2 + 0.7 + carrotBodyHeight, // (size/2) + (leaf base size / 2).
							-0.4, // offset a bit.
						],
						pivot: [0, 0, 0],
						rxdeg: 0,
						rydeg: 0,
						rzdeg: 0,
						s: 0.4,
					},
					// To be filled by update world.
					modelMatrix: [],
					material: { basecolor: carrotStalkAndLeavesColors },
				}),
			],
		),
	],
);
