export const fract = (x: number) => x - Math.floor(x);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const deg2rad = (d: number) => (d * Math.PI) / 180;

export function pingPong01(t: number, freq = 1): number {
	const phase = fract(t * freq);
	return 1 - Math.abs(1 - 2 * phase);
}

export function pingPongAngle(t: number, maxDeg = 25, freq = 1): number {
	const w = pingPong01(t, freq);
	return mix(-deg2rad(maxDeg), deg2rad(maxDeg), w);
}

export function easeInOutBack(x: number): number {
	const c1 = 1.70158;
	const c2 = c1 * 1.525;

	return x < 0.5
		? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
		: (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
}

export function easeInOutSine(x: number): number {
	return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function easeInOutQuad(x: number): number {
	return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeOutCubic(x: number): number {
	return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(x: number): number {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutSine(x: number): number {
	return Math.sin((x * Math.PI) / 2);
}

export function easeOutBounce(x: number): number {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (x < 1 / d1) {
		return n1 * x * x;
	} else if (x < 2 / d1) {
		return n1 * (x -= 1.5 / d1) * x + 0.75;
	} else if (x < 2.5 / d1) {
		return n1 * (x -= 2.25 / d1) * x + 0.9375;
	} else {
		return n1 * (x -= 2.625 / d1) * x + 0.984375;
	}
}

export function easeInBounce(x: number): number {
	return 1 - easeOutBounce(1 - x);
}