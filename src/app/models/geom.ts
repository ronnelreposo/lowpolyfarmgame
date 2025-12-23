import * as mat from "@thi.ng/matrices";
import { toRadians } from "../ds/util";
import { createLeaf, createNode, Tree } from "../ds/tree";
import { Model } from "./unit";
import { assertNever } from "../util";

// Note. TRS is per model instance, not per model.
export type TRS = {
	t: number[],
	pivot: number[],
	rxdeg: number,
	rydeg: number,
	rzdeg: number,
	s: number,
}

function matFromTRS({ t, pivot, rxdeg, rydeg, rzdeg, s }: TRS): number[] {
	const T = mat.translation44([], t);
	const P = mat.translation44([], pivot);
	const nP = mat.translation44([], pivot.map(p => -1 * p));
	const S = mat.scale44([], s);
	const R = mat.quatToMat44([],
		mat.quatFromEuler("xyz",
			toRadians(rxdeg), toRadians(rydeg), toRadians(rzdeg)));
	return mat.mulM44([], T, mat.mulM44([], P,  mat.mulM44([], R, mat.mulM44([], S, nP)))) as number[]; // T*(P*R*S*-P)
}

export function updateWorld(tree: Tree<Model>, parentWorld: number[] = mat.IDENT44 as number[]): Tree<Model> {
	const value = tree.value;
	const baseM = matFromTRS(value.trs);
	const world = mat.mulM44([], parentWorld, baseM); // parent * baseLocal

	const updated: Model = { ...value, modelMatrix: world as number[] };

	if (tree.kind === "leaf") return createLeaf(updated);
	return createNode(updated, tree.children.map(ch => updateWorld(ch, world as number[])));
}


// somewhere shared, e.g. geometry.ts
export const UNIT_CUBE_LOCAL_CORNERS: [number, number, number][] = [
	[-0.5, -0.5, -0.5],
	[0.5, -0.5, -0.5],
	[-0.5, 0.5, -0.5],
	[0.5, 0.5, -0.5],
	[-0.5, -0.5, 0.5],
	[0.5, -0.5, 0.5],
	[-0.5, 0.5, 0.5],
	[0.5, 0.5, 0.5],
];

function transformPoint(M: number[], p: [number, number, number]): [number, number, number] {
	const [x, y, z] = p;

	const wx = M[0] * x + M[4] * y + M[8] * z + M[12];
	const wy = M[1] * x + M[5] * y + M[9] * z + M[13];
	const wz = M[2] * x + M[6] * y + M[10] * z + M[14];

	return [wx, wy, wz];
}

function computeModelAabb(modelMatrix: number[]) {
	let min: [number, number, number] = [ Infinity,  Infinity,  Infinity];
	let max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

	for (const c of UNIT_CUBE_LOCAL_CORNERS) {
		const w = transformPoint(modelMatrix, c);

		min = [
			Math.min(min[0], w[0]),
			Math.min(min[1], w[1]),
			Math.min(min[2], w[2]),
		];
		max = [
			Math.max(max[0], w[0]),
			Math.max(max[1], w[1]),
			Math.max(max[2], w[2]),
		];
	}

	return { min, max };
}
type Vec3 = [number, number, number];

export function withBounds(
	tree: Tree<Model>
): Tree<Model>
{
	if (tree.kind === "leaf") {
		const model = tree.value;
		const { min, max } = computeModelAabb(model.modelMatrix);

		const newModel: Model = {
			...model,
			aabbMin: min,
			aabbMax: max,
		};

		return { kind: "leaf", value: newModel };
	}

	// node: union children
	let min: Vec3 = [ Infinity,  Infinity,  Infinity];
	let max: Vec3 = [-Infinity, -Infinity, -Infinity];
	const newChildren: Tree<Model>[] = [];

	for (const child of tree.children) {
		const r = withBounds(child);
		newChildren.push(r);

		min = [
			Math.min(min[0], r.value.aabbMin?.[0] ?? min[0]),
			Math.min(min[1], r.value.aabbMin?.[1] ?? min[1]),
			Math.min(min[2], r.value.aabbMin?.[2] ?? min[2]),
		];
		max = [
			Math.max(max[0], r.value.aabbMax?.[0] ?? max[0]),
			Math.max(max[1], r.value.aabbMax?.[1] ?? max[1]),
			Math.max(max[2], r.value.aabbMax?.[2] ?? max[2]),
		];
	}

	const newModel: Model = {
		...tree.value,
		aabbMin: min,
		aabbMax: max,
	};

	return {
		kind: "node",
		value: newModel,
		children: newChildren,
	};
}

// function getCubeCount
export function summarizeCubeCount(tree: Tree<Model>): Tree<Model> {

	switch (tree.kind) {
		case "leaf": {
			return tree;
		}
		case "node": {

			const newChildren = tree.children.map(summarizeCubeCount);

			const totalChildrenCubeCount = newChildren.reduce(
				(acc, child) => acc + child.value.cubeCount,
				tree.value.cubeCount
			);

			return {
				...tree,
				value: {
					...tree.value,
					cubeCount: totalChildrenCubeCount
				},
				children: newChildren
			}
		}
		default: { return assertNever(tree); }
	}
}


// // Procedural primitives

// type PrimitiveShape = {
// 	vertices: number[]
// }

// function hexagon2d(radius: number)
