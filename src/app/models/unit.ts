import * as mat from "@thi.ng/matrices";
import { rgbaToColor } from "../ds/util";

export type Mesh = {
	// Geometry
	id: string,
	vertices: number[], // improvement convert to float32array?
	colors: number[],// improvement convert to float32array?
	// Matrices
	baseLocal: Float32Array,
	local: Float32Array,
	worldMatrix: Float32Array,
}
export function unitCube(id: string): Mesh {
	const vertices = [
		// FRONT face (z = +0.5)
		-0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, -0.5, 0.5, 1.0,   // bottom-right
		0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, 0.5, 0.5, 1.0,   // top-left

		// BACK face (z = -0.5)
		0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, -0.5, 1.0,   // bottom-right
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, -0.5, 1.0,   // top-left

		// LEFT face (x = -0.5)
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, 0.5, 1.0,   // bottom-right
		-0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, 0.5, 0.5, 1.0,   // top-right
		-0.5, 0.5, -0.5, 1.0,   // top-left

		// RIGHT face (x = +0.5)
		0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, -0.5, -0.5, 1.0,   // bottom-right
		0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, -0.5, 0.5, 1.0,   // bottom-left
		0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, 0.5, 1.0,   // top-left

		// TOP face (y = +0.5)
		-0.5, 0.5, 0.5, 1.0,  // bottom-left
		0.5, 0.5, 0.5, 1.0,   // bottom-right
		0.5, 0.5, -0.5, 1.0,   // top-right
		-0.5, 0.5, 0.5, 1.0,   // bottom-left
		-0.5, 0.5, -0.5, 1.0,   // top-right
		0.5, 0.5, -0.5, 1.0,   // top-left

		// BOTTOM face (y = -0.5)
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		0.5, -0.5, 0.5, 1.0,   // bottom-right
		0.5, -0.5, -0.5, 1.0,   // top-right
		-0.5, -0.5, -0.5, 1.0,   // bottom-left
		-0.5, -0.5, 0.5, 1.0,   // top-right
		0.5, -0.5, 0.5, 1.0,   // top-left
	];

	const colors: number[] = [
		// FRONT face - orange
		...Array(6).fill(rgbaToColor(243, 156, 18)).flat(),

		// BACK face - violet (wisteria)
		...Array(6).fill(rgbaToColor(142, 68, 173)).flat(),

		// LEFT face - green (gree sea)
		...Array(6).fill(rgbaToColor(22, 160, 133)).flat(),

		// RIGHT face - blue (belize hole)
		...Array(6).fill(rgbaToColor(41, 128, 185)).flat(),

		// TOP face - yellow (sunflower)
		...Array(6).fill(rgbaToColor(241, 196, 15)).flat(),

		// BOTTOM face - red (pomegranate)
		...Array(6).fill(rgbaToColor(192, 57, 43)).flat(),
	];

	// const T = mat.translation44([], [0.0, 0.0, 0.0]); // identity for now.
	// const Rx = mat.rotationX44([], 0);
	// const Ry = mat.rotationY44([], 0);
	// const Rz = mat.rotationZ44([], 0);
	// const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
	// const S = mat.scale44([], 1);
	// // M = T * Rx * Ry * Rz * S
	// const M = mat.mulM44([], T, mat.mulM44([], R, S));

	// // 6 faces, 6 vertices per face.
	// const translates: number[][] = Array.from({ length: 36 }, () => M as number[]);

	return {
		id,
		vertices,
		colors,
		baseLocal: new Float32Array(mat.IDENT44),
		local: new Float32Array(mat.IDENT44),
		worldMatrix: new Float32Array(mat.IDENT44),
	};
}
