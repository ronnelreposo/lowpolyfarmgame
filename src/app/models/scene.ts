import { createLeaf, createNode, mapTree, Tree } from "../ds/tree";
import { rgbaToColor } from "../ds/util";
import { TRS } from "./geom";
import { blackCubeColors, Mesh, Model, setDebugColors, unitCube } from "./unit";

function cubermanHead(id: number): Tree<Model> {
	const rootId = `${id}:cuberman:head`;
	return createNode<Model>(
		{
			id: rootId,
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
			cubeCount: 1,
			renderable: true,
		},
		[
			createLeaf({
				id: `${rootId}:left-ear`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${rootId}:right-ear`,
				mesh: unitCube("unit-cube"),
				trs: {
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
				cubeCount: 1,
				renderable: true,
			}),
		],
	);
}

function createCuberMan(id: number, trs: Partial<TRS>) {
	const rootId = `${id}:cuberman`;
	const defaultTrs: TRS = {
		t: [1, 1, 0],
		pivot: [0, 1, 0],
		rxdeg: 0,
		rydeg: 0,
		rzdeg: 0,
		s: 1.0,
	};
	const mergedTrs = { ...defaultTrs, ...trs };
	return createNode<Model>(
		{
			id: rootId,
			mesh: unitCube("unit-cube"),
			trs: mergedTrs,
			modelMatrix: [],
			material: { basecolor: [] },
			cubeCount: 1,
			renderable: true,
		},
		[
			cubermanHead(id),
			createLeaf({
				id: `${rootId}:left-arm`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${rootId}:right-arm`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${rootId}:left-leg`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${rootId}:right-leg`,
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
				cubeCount: 1,
				renderable: true,
			}),
		],
	);
}

function terrain(id: number, row: number, col: number, gap = 0.01): Tree<Model> {
	let spanModels: Model[] = [];
	for (let i = 0; i < row; i++) {
		for (let j = 0; j < col; j++) {
			spanModels.push(<Model>{
				id: `terrain:${i}:${j}`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [
						(i - (row - 1) / 2) * (1 + gap),
						0,
						(j - (col - 1) / 2) * (1 + gap),
					],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				},
				modelMatrix: [],
				material: {
					basecolor: [
						// Front face.
						...Array(6)
							.fill(rgbaToColor(149, 165, 166))
							.flat(),
						// Back face.
						...Array(6)
							.fill(rgbaToColor(149, 165, 166))
							.flat(),
						// Left face.
						...Array(6)
							.fill(rgbaToColor(149, 165, 166))
							.flat(),
						// Right face.
						...Array(6)
							.fill(rgbaToColor(149, 165, 166))
							.flat(),
						// Top face.
						...Array(6)
							.fill(rgbaToColor(39, 174, 96)) // nephritis
							.flat(),
						// Bottom face.
						...Array(6)
							.fill(rgbaToColor(149, 165, 166)) // concrete
							.flat(),
					]
				},
				cubeCount: 1,
				renderable: true,
			});
		}
	}
	return createNode<Model>(
		{
			id: `${id}:terrain:root-anchor`,
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
			material: { basecolor: blackCubeColors },
			cubeCount: 1,
			renderable: false,
		},
		spanModels.map(createLeaf),
	);
}

export function generateTerrain(id: number, row: number, col: number, withTrs: (trs: TRS) => Model, gap = 0.01): Tree<Model> {
	let spanModels: Model[] = [];
	for (let i = 0; i < row; i++) {
		for (let j = 0; j < col; j++) {
			spanModels.push(withTrs(
				{
					t: [
						(i - (row - 1) / 2) * (1 + gap),
						0,
						(j - (col - 1) / 2) * (1 + gap),
					],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				})
			);
		}
	}
	return createNode<Model>(
		{
			id: `${id}:terrain:root-anchor`,
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
			material: { basecolor: blackCubeColors },
			cubeCount: 1,
			renderable: false,
		},
		spanModels.map(createLeaf),
	);
}

// Got pushed trerain. 100x100.
// Got pushed cuberman to 100.
// Upon introduction of shadows, the performance hits on gpu not on sim.

const terrainWidth = 12;
const terrainHeight = 12;
const cuberManCount = 1;

const fencePolePerRow = 20;
const fenceRowDistanceToCenter = 5;
const fenceScale = 0.3;

const carrotOffset = 1.0;
const carrotBodyHeight = 0.5 + 0.7 + 0.4 + carrotOffset;
const carrotStalkAndLeavesColors = Array(36)
	.fill(rgbaToColor(39, 174, 96)) // nephritis
	.flat();
const carrotBodyColors = Array(36)
	.fill(rgbaToColor(243, 156, 18)) // carrot
	.flat();

// Bare no colors and not placed in the world yet.
export const myModelWorld: Tree<Model> = createNode<Model>(
	{
		id: "global-root-anchor",
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
		material: { basecolor: blackCubeColors },
		cubeCount: 1,
		renderable: false,
	},
	[
		// Cuberman army!
		...Array(cuberManCount)
			.fill(null)
			.map((_, i) => mapTree(createCuberMan(i, { t: [ 0, 1.5, 0 ] }), setDebugColors)),

		// Terrain.
		terrain(0, terrainWidth, terrainHeight),

		// carrot.
		createCarrotModel(0, { t: [ 0, 0, 0 ] }),
		createCarrotModel(1, { t: [ 1, 0, 0 ] }),
		createCarrotModel(2, { t: [ 2, 0, 0 ] }),

		// left side fence.
		createRowFencePolesModel(0, fencePolePerRow, [fenceRowDistanceToCenter, 0, 0], 90, fenceScale, { spacing: 1.7 }),
		// right side fence.
		createRowFencePolesModel(1, fencePolePerRow, [-fenceRowDistanceToCenter, 0, 0], 90, fenceScale, { spacing: 1.7 }),
		// front fence.
		createRowFencePolesModel(2, fencePolePerRow, [0, 0, fenceRowDistanceToCenter], 0, fenceScale, { spacing: 1.7 }),
		// // back fence.
		createRowFencePolesModel(3, fencePolePerRow, [0, 0, -fenceRowDistanceToCenter], 0, fenceScale, { spacing: 1.7 }),
	],
);

function createFencePoleModel(id: number, fenceRowId: number, pos: number[]): Tree<Model> {
	const fencePoleId = `${fenceRowId}:${id}:fence-pole`;
	return createNode<Model>(
		{
			id: `${fencePoleId}:root-anchor`,
			mesh: unitCube("unit-cube"),
			trs: {
				t: pos,
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1,
			},
			// To be filled by update world.
			modelMatrix: [],
			material: { basecolor: blackCubeColors },
			cubeCount: 1,
			renderable: false,
		},
		[
			createLeaf({
				id: `${fencePoleId}:fence-body-0`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [0, 1, 0],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				}, // 0.7
				// To be filled by update world.
				modelMatrix: [],
				material: { basecolor: carrotBodyColors },
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${fencePoleId}:fence-body-1`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [0, 2, 0],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				},
				// To be filled by update world.
				modelMatrix: [],
				material: { basecolor: carrotBodyColors },
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${fencePoleId}:fence-body-2`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [0, 3, 0],
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 1,
				},
				// To be filled by update world.
				modelMatrix: [],
				material: { basecolor: carrotBodyColors },
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${fencePoleId}:fence-body-3`,
				mesh: unitCube("unit-cube"),
				trs: {
					t: [0, 3.75, 0], // 3 + (scale/2)
					pivot: [0, 0, 0],
					rxdeg: 0,
					rydeg: 0,
					rzdeg: 0,
					s: 0.5,
				},
				// To be filled by update world.
				modelMatrix: [],
				material: { basecolor: carrotBodyColors },
				cubeCount: 1,
				renderable: true,
			})
		],
	);
}

function createRowFencePolesModel(
	id: number,
	count: number,
	t: [number, number, number], rydeg: number, scale: number, config: { spacing: number }): Tree<Model> {
	return createNode({
		id: `${id}:row-fence:root-anchor`,
		mesh: unitCube("unit-cube"),
		trs: {
			t: t,
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: rydeg,
			rzdeg: 0,
			s: scale,
		},
		// To be filled by update world.
		modelMatrix: [],
		material: { basecolor: blackCubeColors },
		cubeCount: 1,
		renderable: false,
	},
		Array(count)
			.fill(null)
			.map((x, i) => createFencePoleModel(i, id, [(i - (count - 1) / 2) * config.spacing, 0, 0])) // centered.
	);
}

function createCarrotModel(id: number, trs: Partial<TRS>): Tree<Model> {
	const carrotId = `${id}:carrot`;
	const defaultTrs: TRS = {
		t: [0, 0, 0],
		pivot: [0, 1, 0],
		rxdeg: 0,
		rydeg: 0,
		rzdeg: 0,
		s: 1.0,
	};
	const mergedTrs = { ...defaultTrs, ...trs };
	return createNode<Model>(
		{
			id: `${carrotId}:root-anchor`,
			mesh: unitCube("unit-cube"),
			trs: mergedTrs,
			// To be filled by update world.
			modelMatrix: [],
			material: { basecolor: blackCubeColors },
			cubeCount: 1,
			renderable: false,
		},
		[
			createLeaf({
				id: `${carrotId}:body1`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:body2`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:body3`,
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
				cubeCount: 1,
				renderable: true,
			}),
			// Carrot leaves.
			createLeaf({
				id: `${carrotId}:stalk`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:leaf1`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:leaf2`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:leaf3`,
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
				cubeCount: 1,
				renderable: true,
			}),
			createLeaf({
				id: `${carrotId}:leaf4`,
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
				cubeCount: 1,
				renderable: true,
			}),
		],
	)
}

export const emptyMesh: Mesh = {
	id: "",
	positions: [],
	normals: [],
	vertexCount: 0,
	triangleCount: 0,
};

// four scars on top face configurable.
export function chamferedRock2(): Tree<Model> {

	const c1 = 0.25;
	const c2 = 0.25;
	const c3 = 0.25;
	const c4 = 0.25;
	const c5 = 0.25;
	const c6 = 0.25;
	const c7 = 0.25;
	const c8 = 0.25;
	const t1: Model = {
		id: "t1",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t1",
			positions: [
				-c1, 0.5, 0, 1,
				c2, 0.5, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t2: Model = {
		id: "t2",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				1, 0.68, 0.37, 1, // Color. Nephritis.
				1, 0.68, 0.37, 1, // Color. Nephritis.
				1, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t2",
			positions: [
				c2, 0.5, 0, 1,
				0.5, c3, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t3: Model = {
		id: "t3",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t3",
			positions: [
				0.5, c3, 0, 1,
				0.5, -c4, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t4: Model = {
		id: "t4",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				1.0, 0.68, 0.37, 1, // Color. Nephritis.
				1.0, 0.68, 0.37, 1, // Color. Nephritis.
				1.0, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t4",
			positions: [
				0.5, -c4, 0, 1,
				c5, -0.5, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t5: Model = {
		id: "t5",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t5",
			positions: [
				c5, -0.5, 0, 1,
				-c6, -0.5, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t6: Model = {
		id: "t6",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				1, 0.68, 0.37, 1,
				1, 0.68, 0.37, 1,
				1, 0.68, 0.37, 1,
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t6",
			positions: [
				-c6, -0.5, 0, 1,
				-0.5, -c7, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t7: Model = {
		id: "t7",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
				0.15, 0.68, 0.37, 1, // Color. Nephritis.
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t7",
			positions: [
				-0.5, -c7, 0, 1,
				-0.5, c8, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	const t8: Model = {
		id: "t8",
		trs: {
			t: [0, 0, 0],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: {
			basecolor: [
				1, 0.68, 0.37, 1,
				1, 0.68, 0.37, 1,
				1, 0.68, 0.37, 1,
			]
		},
		cubeCount: 0,
		renderable: true,
		mesh: {
			id: "t8",
			positions: [
				-0.5, c8, 0, 1,
				-c1, 0.5, 0, 1,
				0, 0, 0, 1,
			],
			normals: [
				0, 0, 1, 0,
				0, 0, 1, 0,
				0, 0, 1, 0,
			],
			vertexCount: 3,
			triangleCount: 1,
		}
	};
	// front face.
	const frontFace: Tree<Model> = createNode({
		id: "front-face",
		trs: {
			t: [0, 0, 0.5],
			pivot: [0, 0, 0],
			rxdeg: 0,
			rydeg: 0,
			rzdeg: 0,
			s: 1,
		},
		modelMatrix: [],
		material: { basecolor: [] },
		cubeCount: 0,
		renderable: false,
		mesh: emptyMesh
	}, [
		createLeaf(t1),
		createLeaf(t2),
		createLeaf(t3),
		createLeaf(t4),
		createLeaf(t5),
		createLeaf(t6),
		createLeaf(t7),
		createLeaf(t8),
	]);

	return frontFace;
}

// Utilities.
