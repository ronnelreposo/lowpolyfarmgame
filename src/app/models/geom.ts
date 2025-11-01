import * as mat from "@thi.ng/matrices";
import { toRadians } from "../ds/util";
import { createLeaf, createNode, Tree } from "../ds/tree";

export type TRS = {
	id: string, // temporary
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

export function updateWorld(tree: Tree<TRS>, parentWorld: number[] = mat.IDENT44 as number[]): Tree<TRS & { worldMatrix: number[] }> {
	const value = tree.value;
	const baseM = matFromTRS(value);
	const world = mat.mulM44([], parentWorld, baseM); // parent * baseLocal

	const updated: TRS & { worldMatrix: number[] } = { ...value, worldMatrix: world as number[] };

	if (tree.kind === "leaf") return createLeaf(updated);
	return createNode(updated, tree.children.map(ch => updateWorld(ch, world as number[])));
}
