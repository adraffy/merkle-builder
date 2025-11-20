import { describe, expect, test } from "bun:test";
import { randomBytes, randomInt } from "crypto";
import { Coder } from "../src/coder.js";
import { insertNode, toNibblePath } from "../src/trie.js";
import { trimLeadingZeros } from "../src/utils.js";

describe("coder", () => {
	// test("null", () => {
	// 	const coder = new Coder();
	// 	const node = undefined;
	// 	coder.writeNode(node);
	// 	coder.pos = 0;
	// 	expect(coder.readNode()).toStrictEqual(node);
	// });

	// test("leaf", () => {
	// 	const coder = new Coder();
	// 	const node = {
	// 		path: Uint8Array.of(1, 2, 3),
	// 		value: Uint8Array.of(4, 5, 6),
	// 	};
	// 	coder.writeNode(node);
	// 	coder.pos = 0;
	// 	expect(coder.readNode()).toStrictEqual(node);
	// });

	// test("branch", () => {
	// 	const coder = new Coder();
	// 	const node = {
	// 		children: Array(16).fill(undefined),
	// 	};
	// 	coder.writeNode(node);
	// 	coder.pos = 0;
	// 	expect(coder.readNode()).toStrictEqual(node);
	// });

	for (let i = 0; i < 50; i++) {
		test(`#${i}`, () => {
			const coder = new Coder();
			let node = undefined;
			for (let i = 0, n = randomInt(0, 32); i < n; i++) {
				node = insertNode(
					node,
					toNibblePath(randomBytes(32)),
					trimLeadingZeros(randomBytes(32))
				);
			}
			coder.writeNode(node);
			coder.pos = 0;
			expect(coder.readNode()).toStrictEqual(node);
		});
	}
});
