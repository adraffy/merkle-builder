import { describe, expect, test } from "bun:test";
import {
	deleteNode,
	extractNode,
	findLeaf,
	insertLeaf,
	insertNode,
	isBranch,
	isExtension,
	isLeaf,
	toNibblePath,
} from "../src/trie.js";
import { keccak256 } from "../src/utils.js";
import { randomTrie } from "./utils.js";
import { toJSON } from "../src/json.js";

describe("trie", () => {
	describe("findNode", () => {
		test("empty", () => {
			expect(findLeaf(undefined, new Uint8Array(0))).toBeUndefined();
		});

		for (let i = 0; i < 10; ++i) {
			test(`#${i}`, () => {
				const { node, storage } = randomTrie();
				for (const [k, v] of storage) {
					expect(
						findLeaf(node, toNibblePath(keccak256(k)))?.value
					).toStrictEqual(v);
				}
			});
		}
	});

	describe("deleteNode", () => {
		//  _  = branch
		// [_] = leaf
		// (_) = extension
		//  *  = deleted

		test("delete leaf by prefix", () => {
			//    root     ==>   null
			//     /
			//    0*
			//   / \
			// [0] [1]
			let a = undefined;
			a = insertLeaf(a, Uint8Array.of(0, 0), Uint8Array.of(1));
			expect(isLeaf(a)).toBeTrue();
			expect(deleteNode(a, Uint8Array.of(0))).toBeUndefined();
		});

		test("delete branch by prefix", () => {
			//     root   ==>   [11]
			//     /  \
			//    0*   1
			//   / \    \
			// [0] [1]   [1]
			let a = undefined;
			a = insertLeaf(a, Uint8Array.of(0, 0), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(0, 1), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(1, 1), Uint8Array.of(1));
			let b = undefined;
			b = insertLeaf(b, Uint8Array.of(1, 1), Uint8Array.of(1));
			expect(isBranch(a)).toBeTrue();
			expect(deleteNode(a, Uint8Array.of(0))).toStrictEqual(b);
			expect(isLeaf(b));
		});

		test("collapse branch", () => {
			//     root    ==>    (1)
			//     /  \           /  \
			//    0*   1        [0]  [1]
			//   /    / \
			// [0]  [0] [1]
			let a = undefined;
			a = insertLeaf(a, Uint8Array.of(0, 0), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(1, 0), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(1, 1), Uint8Array.of(1));
			let b = undefined;
			b = insertLeaf(b, Uint8Array.of(1, 0), Uint8Array.of(1));
			b = insertLeaf(b, Uint8Array.of(1, 1), Uint8Array.of(1));
			expect(isBranch(a)).toBeTrue();
			expect(deleteNode(a, Uint8Array.of(0))).toStrictEqual(b);
			expect(isExtension(b)).toBeTrue();
		});

		test("delete extension by prefix", () => {
			//     root    ==>   null
			//     /
			//   (0)*
			//   / \
			// [0] [1]
			let a = undefined;
			a = insertLeaf(a, Uint8Array.of(0, 0), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(0, 1), Uint8Array.of(1));
			expect(isExtension(a)).toBeTrue();
			expect(deleteNode(a, Uint8Array.of(0))).toBeUndefined();
		});

		test("collapse extension", () => {
			//     root    ==>    [01]
			//     /
			//   (0)
			//   /  \
			// [0]* [1]
			let a = undefined;
			a = insertLeaf(a, Uint8Array.of(0, 0), Uint8Array.of(1));
			a = insertLeaf(a, Uint8Array.of(0, 1), Uint8Array.of(1));
			let b = undefined;
			b = insertLeaf(b, Uint8Array.of(0, 1), Uint8Array.of(1));
			expect(isExtension(a)).toBeTrue();
			expect(deleteNode(a, Uint8Array.of(0, 0))).toStrictEqual(b);
			expect(isLeaf(b)).toBeTrue();
		});
	});


	describe('extractNode', () => {


		test("a", () => {
			const { node, storage } = randomTrie(4);


			const index = (storage.length * Math.random()) | 0;
			const [,,path] = storage[index];
			const part = extractNode(node, path);
			const rest = deleteNode(node, path);

			console.log(toJSON(node));

			console.log(toJSON(part));
			console.log(toJSON(rest));
			console.log(toJSON(insertNode(rest, path, part)));


			const node2 = insertNode(rest, path, part);
			//expect(node2).toStrictEqual(node);
		});


	});
});
