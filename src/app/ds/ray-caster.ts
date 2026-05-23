import * as vec from "@thi.ng/vectors";
import { Model } from "../models/unit";
import { Tree } from "./tree";

export type Ray = {
	origin: vec.Vec3,
	direction: vec.Vec3
}

export type RayHit = {
	distance: number;
	model: Model;
}

export type IntersectedModel = { modelId: Model["id"], minDistance: number }

export function intersectRayAabb(
	rayOrigin: number[],
	rayDir: number[],
	boxMin: number[],
	boxMax: number[]
): number | null {
	let tMin = 0.0;
	let tMax = Infinity;

	for (let i = 0; i < 3; i++) {
		const invD = 1.0 / rayDir[i];

		let t0 = (boxMin[i] - rayOrigin[i]) * invD;
		let t1 = (boxMax[i] - rayOrigin[i]) * invD;

		if (invD < 0.0) {
			const temp = t0;
			t0 = t1;
			t1 = temp;
		}

		tMin = t0 > tMin ? t0 : tMin;
		tMax = t1 < tMax ? t1 : tMax;

		if (tMax <= tMin) return null;
	}

	return tMin;
}

function selectModel(ray: Ray, worldTree: Tree<Model>): IntersectedModel | undefined {
	switch (worldTree.kind) {
		case "leaf": {
			const model = worldTree.value;
			const hit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				model.aabbMin as number[],
				model.aabbMax as number[]
			);
			if (!hit) { return undefined; }
			return { modelId: model.id, minDistance: hit };
		}
		case "node": {
			const groupModel = worldTree.value;
			const groupHit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				groupModel.aabbMin as number[],
				groupModel.aabbMax as number[]
			);
			if (!groupHit) {
				return undefined;
			}
			let closestHit: IntersectedModel | undefined;
			for (const child of worldTree.children) {
				const childResult = selectModel(ray, child);
				if (childResult) {
					if (!closestHit || childResult.minDistance < closestHit.minDistance) {
						closestHit = childResult;
					}
				}
			}
			return closestHit;
		}
	}
}

export function selectModels(ray: Ray, worldTree: Tree<Model>, selectEntireModel = true): IntersectedModel[] {
	switch (worldTree.kind) {
		case "leaf": {
			const model = worldTree.value;
			const hit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				model.aabbMin as number[],
				model.aabbMax as number[]
			);
			if (!hit) { return []; }
			return [{ modelId: model.id, minDistance: hit }];
		}
		case "node": {
			const groupModel = worldTree.value;
			const groupHit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				groupModel.aabbMin as number[],
				groupModel.aabbMax as number[]
			);
			if (!groupHit) {
				return [];
			}
			const selectedChildrenModels = worldTree.children.flatMap(child => selectModels(ray, child));
			if (!groupModel.renderable) {
				return selectedChildrenModels;
			}
			return [
				{ modelId: groupModel.id, minDistance: groupHit },
				...selectedChildrenModels
			];
		}
	}
}