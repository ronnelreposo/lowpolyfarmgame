import { rgbaToColor } from "../ds/util";
// import { TRS } from "./geom";

export type Mesh = {
	id: string,
	vertices: number[], // improvement convert to float32array?
	colors: number[],// improvement convert to float32array?
	// geometry: TRS,
	vertexCount: number,
	triangleCount: number,
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

	return {
		id,
		vertices,
		colors,
		vertexCount: vertices.length / Universal.floatsPerVertex,
		triangleCount: vertices.length / (Universal.floatsPerVertex * 3), // three vertices to form a triangle.
	};
}

export const Universal = (() => {
	const numOfVertices = 3; // Triangle primitive
	const trianglePerFace = 2;
	const floatsPerVertex = 4;

	const cubeFaces = 6;
	const cubeNumOfVertices = numOfVertices * cubeFaces * trianglePerFace;

	return {
		numOfVertices: numOfVertices,
		floatsPerVertex,
		// Dynamic if you dream of tesselation. LOL keep dreaming 😅
		// Seriously. You could extend this model.
		unitCube: {
			faces: 6,
			trianglePerFace: 2,
			numOfVertices: cubeNumOfVertices,
			vertexFloatCount: cubeNumOfVertices * floatsPerVertex,
		}
	};
})();
