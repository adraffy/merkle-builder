import { keccak256 } from "./utils.js";

type LeafNode = { path: Uint8Array; value: Uint8Array };
type ExtensionNode = { path: Uint8Array; child: Node };
type BranchNode = { children: MaybeNode[] };

export type Node = LeafNode | ExtensionNode | BranchNode;
export type MaybeNode = Node | undefined;

const RLP_NULL = encodeRlpBytes(new Uint8Array(0)); // 0x80
const RLP_EMPTY = encodeRlpList([encodeRlpList([])]); // 0xc1c0
const HASH_NULL = keccak256(RLP_NULL);

export function isBranch(node: Node): node is BranchNode {
	return "children" in node;
}

export function isExtension(node: Node): node is ExtensionNode {
	return "child" in node;
}

export function isLeaf(node: Node): node is LeafNode {
	return "value" in node;
}

export function isEmptyLeaf(node: Node) {
	return isLeaf(node) && !node.path.length && !node.value.length;
}

function common(a: Uint8Array, b: Uint8Array): number {
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) ++i;
	return i;
}

export function insertNode(
	node: MaybeNode,
	path: Uint8Array,
	value: Uint8Array
): Node {
	if (value[0] === 0)
		throw new Error(
			`expected trimmed: ${Buffer.from(value).toString("hex")}`
		);
	if (!node) {
		return { path, value };
	} else if (isBranch(node)) {
		if (!path.length) {
			return { children: node.children, value };
		}
		const i = path[0];
		const children = node.children.slice();
		const child = insertNode(children[i], path.subarray(1), value);
		children[i] = child;
		return { children };
	} else if (isExtension(node)) {
		const other = node.path;
		const i = common(other, path);
		if (i === other.length) {
			return {
				path: other,
				child: insertNode(node.child, path.subarray(i), value),
			};
		}
		const b = newBranch();
		if (i < other.length) {
			const rest = other.subarray(i + 1);
			b.children[other[i]] = rest.length
				? { path: rest, child: node.child }
				: node.child;
		}
		b.children[path[i]] = { path: path.subarray(i + 1), value };
		return i ? { path: path.subarray(0, i), child: b } : b;
	} else {
		const other = node.path;
		const i = common(other, path);
		if (i === other.length && i === path.length) {
			return { path, value }; // replace
		}
		const b = newBranch();
		if (i < other.length) {
			b.children[other[i]] = {
				path: other.subarray(i + 1),
				value: node.value,
			};
		}
		if (i < path.length) {
			b.children[path[i]] = { path: path.subarray(i + 1), value };
		} else {
			throw new Error("bug");
		}
		return i ? { path: path.subarray(0, i), child: b } : b;
	}
}

function newBranch(): BranchNode {
	return { children: Array(16).fill(undefined) };
}

export function encodeNode(node: MaybeNode): Uint8Array {
	if (!node) {
		return RLP_NULL;
	} else if (isBranch(node)) {
		return encodeRlpList([...node.children.map(encodeNodeRef), RLP_NULL]);
	} else if (isExtension(node)) {
		return encodeRlpList([
			encodeRlpBytes(encodePath(node.path, false)),
			encodeNodeRef(node.child),
		]);
	} else {
		return encodeRlpList([
			encodeRlpBytes(encodePath(node.path, true)),
			encodeRlpBytes(encodeRlpBytes(node.value)),
		]);
	}
}

function encodeNodeRef(node: MaybeNode) {
	if (!node) {
		return RLP_NULL;
	} else if (isEmptyLeaf(node)) {
		return RLP_EMPTY;
	} else {
		const v = encodeNode(node);
		return encodeRlpBytes(v.length < 32 ? v : keccak256(v));
	}
}

export function getRootHash(node: MaybeNode): Uint8Array {
	if (!node) return HASH_NULL;
	const v = encodeNode(node);
	return v.length < 32 ? v : keccak256(v);
}

export function toNibblePath(v: Uint8Array) {
	const u = new Uint8Array(v.length << 1);
	let i = 0;
	for (const x of v) {
		u[i++] = x >> 4;
		u[i++] = x & 15;
	}
	return u;
}

function encodePath(path: Uint8Array, leaf: boolean): Uint8Array {
	const v = new Uint8Array(1 + (path.length >> 1));
	if (leaf) v[0] = 32;
	const odd = path.length & 1;
	if (path.length & 1) v[0] |= 16 | path[0];
	for (let i = odd, j = 1; i < path.length; i += 2, j++) {
		v[j] = (path[i] << 4) | path[i + 1];
	}
	return v;
}

function encodeRlpLength(start: number, length: number): Uint8Array {
	const max = 55;
	if (length <= max) return Uint8Array.of(start + length);
	const v = new Uint8Array(8);
	let i = v.length;
	for (; length; length >>= 8, ++start) {
		v[--i] = length & 255;
	}
	v[--i] = start + max;
	return v.subarray(i);
}

function encodeRlpList(m: Uint8Array[]): Uint8Array {
	return Buffer.concat([
		encodeRlpLength(
			0xc0,
			m.reduce((a, x) => a + x.length, 0)
		),
		...m,
	]);
}

function encodeRlpBytes(v: Uint8Array): Uint8Array {
	const max = 0x80;
	if (v.length == 1 && v[0] < max) return v;
	return Buffer.concat([encodeRlpLength(max, v.length), v]);
}
