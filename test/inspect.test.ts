import { describe, expect, test } from "bun:test";
import { byteCount, leafCount, nodeCount } from "../src/inspect.js";
import { insertLeaf, isBranch, isExtension, isLeaf } from "../src/trie.js";

describe("inspect", () => {
	test("null", () => {
		const node = undefined;
		expect(nodeCount(node)).toStrictEqual(0);
		expect(leafCount(node)).toStrictEqual(0);
		expect(byteCount(node)).toStrictEqual(0);
	});

	test("leaf", () => {
		let node = undefined;
		node = insertLeaf(node, Uint8Array.of(), Uint8Array.of(1, 2, 3));
		expect(isLeaf(node)).toBeTrue();
		expect(nodeCount(node)).toStrictEqual(1);
		expect(leafCount(node)).toStrictEqual(1);
		expect(byteCount(node)).toStrictEqual(3);
	});

	test("branch", () => {
		let node = undefined;
		node = insertLeaf(node, Uint8Array.of(0), Uint8Array.of(1, 2));
		node = insertLeaf(node, Uint8Array.of(1), Uint8Array.of(3, 4));
		expect(isBranch(node)).toBeTrue();
		expect(nodeCount(node)).toStrictEqual(3);
		expect(leafCount(node)).toStrictEqual(2);
		expect(byteCount(node)).toStrictEqual(20);
	});

	test("extension", () => {
		let node = undefined;
		node = insertLeaf(node, Uint8Array.of(0, 0, 0), Uint8Array.of(1, 2));
		node = insertLeaf(node, Uint8Array.of(0, 0, 1), Uint8Array.of(3, 4));
		expect(isExtension(node)).toBeTrue();
		expect(nodeCount(node)).toStrictEqual(4);
		expect(leafCount(node)).toStrictEqual(2);
		expect(byteCount(node)).toStrictEqual(22);
	});
});
