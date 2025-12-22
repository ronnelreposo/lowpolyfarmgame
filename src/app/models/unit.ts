import { Tree } from "../ds/tree";
import { rgbaToColor } from "../ds/util";
import { TRS } from "./geom";
// import { TRS } from "./geom";

export type Mesh = {
	id: string,
	positions: number[], // improvement convert to float32array?
	normals: number[],

	// Useful data.
	/**
	 * Number of vertices not floats.
	*/
	vertexCount: number,
	triangleCount: number,
}
//. TODO. remove id?
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

	const normals = [
		// FRONT face
		...Array(6).fill([0, 0, 1, 0]).flat(),
		// BACK face
		...Array(6).fill([0, 0, -1, 0]).flat(),
		// LEFT face
		...Array(6).fill([-1, 0, 0, 0]).flat(),
		// RIGHT face
		...Array(6).fill([1, 0, 0, 0]).flat(),
		// TOP face
		...Array(6).fill([0, 1, 0, 0]).flat(),
		// BOTTOM face
		...Array(6).fill([0, -1, 0, 0]).flat(),
	];

	return {
		id,
		positions: vertices,
		normals,
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

export type Model = {
	id: string,
	mesh: Mesh,
	trs: TRS,
	// aka world matrix = parentworld * local.
	modelMatrix: number[]; // mat.m44.
	material: {
		basecolor: number[],
		// Later material.
		// texture, metallic, roughness
	},
	aabbMin?: [number, number, number];
	aabbMax?: [number, number, number];
	// Sums
	cubeCount: number;
}

// DEBUG cube. derive color from mesh.
export function setDebugColors(model: Model): Model {
	return {
		...model,
		material: {
			...model.material,
			basecolor: [
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
			]
		}
	};
}

export const blackCubeColors = Array(36).fill(rgbaToColor(0, 0, 0)).flat();

export function setTerrainColors(model: Model): Model {
	return {
		...model,
		material: {
			...model.material,
			basecolor: [
				// Front face.
				...Array(6)
					.fill(rgbaToColor(1, 1, 1))
					.flat(),
				// Back face.
				...Array(6)
					.fill(rgbaToColor(243, 156, 18))
					.flat(),
				// Left face.
				...Array(6)
					.fill(rgbaToColor(243, 156, 18))
					.flat(),
				// Right face.
				...Array(6)
					.fill(rgbaToColor(243, 156, 18))
					.flat(),
				// Top face.
				...Array(6)
					.fill(rgbaToColor(1, 1, 1))
					.flat(), // carrot
				// Bottom face.
				...Array(6)
					.fill(rgbaToColor(243, 156, 18))
					.flat(),
			]
		}
	};
}

type FlattenedNode = {
	modelId: string;
	firstChild: string | undefined;
	nextSibling: string | undefined;
	parent: string | undefined;
}
type FlattenedIndices = {
	modelId: string;
	index: number;

	// -1 would be undefined.

	firstChild: number;
	nextSibling: number;
	parent: number;
}

export function flattenedTreeConnections(
	tree: Tree<Model>,
	parentId: string | undefined = undefined,
	nextSiblingId: string | undefined = undefined
): FlattenedNode[] {
	switch (tree.kind) {
		case "leaf": {
			return [
				{
					modelId: tree.value.id,
					firstChild: undefined,
					nextSibling: nextSiblingId,
					parent: parentId
				}
			];
		}
		case "node": {
			// Process children.
			const flattenedChildren = tree.children
				.flatMap((child, i) =>
					flattenedTreeConnections(child,
						tree.value.id,
						tree.children[i + 1]?.value.id));
			return [
				<FlattenedNode>{
					modelId: tree.value.id,
					firstChild: tree.children[0]?.value.id,
					nextSibling: nextSiblingId,
					parent: parentId
				}
			].concat(flattenedChildren);
		}
	}
}
export function buildFlattenedIndices(
	fNode: FlattenedNode,
	// modelId, flattened index.
	lookup: Map<string, number>
): FlattenedIndices {
	return {
		modelId: fNode.modelId,
		index: lookup.get(fNode.modelId) ?? -1,
		firstChild: fNode.firstChild ? lookup.get(fNode.firstChild) ?? -1 : -1,
		nextSibling: fNode.nextSibling ? lookup.get(fNode.nextSibling) ?? -1 : -1,
		parent: fNode.parent ? lookup.get(fNode.parent) ?? -1 : -1,
	};
}
