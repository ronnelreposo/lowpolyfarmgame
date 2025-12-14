
export function assertNever<T>(_: never): T {
	console.trace();
	throw new Error("Value is not never.");
}
