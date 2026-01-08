import { isExtension, isLeaf, type MaybeNode } from "./trie.js";

export function byteCount(
	node: MaybeNode,
	sizeOf = (v: Uint8Array) => v.length
): number {
	if (!node) {
		return 0;
	} else if (isLeaf(node)) {
		return sizeOf(node.path) + sizeOf(node.value);
	} else if (isExtension(node)) {
		return sizeOf(node.path) + byteCount(node.child, sizeOf);
	} else {
		return node.children.reduce(
			(a, x) => a + byteCount(x, sizeOf),
			(node.cache ? sizeOf(node.cache) : 0) + node.children.length
		);
	}
}

export function leafCount(node: MaybeNode): number {
	if (!node) {
		return 0;
	} else if (isLeaf(node)) {
		return 1;
	} else if (isExtension(node)) {
		return leafCount(node.child);
	} else {
		return node.children.reduce((a, x) => a + leafCount(x), 0);
	}
}

export function nodeCount(node: MaybeNode): number {
	if (!node) {
		return 0;
	} else if (isLeaf(node)) {
		return 1;
	} else if (isExtension(node)) {
		return 1 + nodeCount(node.child);
	} else {
		return node.children.reduce((a, x) => a + nodeCount(x), 1);
	}
}
