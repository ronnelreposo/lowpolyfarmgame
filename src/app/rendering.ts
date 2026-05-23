import * as mat from "@thi.ng/matrices";

export const near = 0.1;
export const far = 100.0;

export function viewProjection(params: { width: number, height: number, camera: number[], initialCameraPosition: number[] }): number[] {
	const fovDegrees = 60;
	const aspect = params.width / params.height;

	const P = mat.perspective([], fovDegrees, aspect, near, far);

	const eye = [params.camera[0], params.camera[1], params.camera[2]];
	const subj = [0, 0, 0];
	const up = [0, 1, 0];
	const V = mat.lookAt([], eye, subj, up);

	return mat.mulM44([], P, V) as number[];
}