

export function toRadians(degrees: number): number {
	return degrees * Math.PI / 180;
}

export function toDegrees(radians: number): number {
	return radians * 180 / Math.PI;
}

export function rgbaToColor (r: number, g: number, b: number, a: number = 1): number[] {
	return [r / 255, g / 255, b / 255, a / 1];
};
