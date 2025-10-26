
export type Tree<T>
	= { kind: "leaf", value: T }
	| { kind: "node", value: T, children: Tree<T>[] }

// constructors
export function createLeaf<T>(value: T): Tree<T> {
	return { kind: "leaf", value };
}

export function createNode<T>(value: T, children: Tree<T>[]): Tree<T> {
	return { kind: "node", value, children };
}

export function mapTree<T, U>(tree: Tree<T>, f: (value: T) => U): Tree<U> {
	if (tree.kind === "leaf") {
		return createLeaf(f(tree.value));
	}
	return createNode(f(tree.value), tree.children.map(child => mapTree(child, f)));
}

export function flatMapTree<T, U>(tree: Tree<T>, f: (v: T) => Tree<U>): Tree<U> {
	const replaced = f(tree.value);                 // subtree to splice in
	if (tree.kind === "leaf") return replaced;      // nothing to graft

	const kids = tree.children.map(c => flatMapTree(c, f));

	if (replaced.kind === "leaf") {
	// need a node to host the (mapped) original children
	return createNode(replaced.value, kids);
	}
	// keep any children produced by f, plus the mapped original children
	return createNode(replaced.value, [...replaced.children, ...kids]);
}

export function reduceTree<T, R>(
	tree: Tree<T>,
	reducer: (acc: R, value: T) => R,
	initial: R
): R {
	const accHere = reducer(initial, tree.value);
	return tree.kind === "node"
		? tree.children.reduce(
			(acc, child) => reduceTree(child, reducer, acc),
			accHere
		)
		: accHere;
}
