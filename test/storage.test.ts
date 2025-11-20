import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomBytes, randomInt } from "crypto";
import { Foundry } from "@adraffy/blocksmith";
import {
	type MaybeNode,
	insertNode,
	toNibblePath,
	getRootHash,
} from "../src/trie.js";
import {
	bigIntFrom,
	bytesFrom,
	trimLeadingZeros,
	keccak256,
	toHex,
} from "../src/utils.js";
import { insertBytes } from "../src/kv.js";
import { getStorageHash } from "./utils.js";

describe("StorageHash", () => {
	let F: Foundry;
	beforeAll(async () => {
		F = await Foundry.launch({ infoLog: false });
	});
	afterAll(() => F?.shutdown());

	const N = 50;

	describe("sstore", () => {
		for (let i = 0; i < N; ++i) {
			const storage = [
				...new Map(
					Array.from({ length: randomInt(0, 100) }, () => [
						bigIntFrom(randomBytes(randomInt(1, 32))),
						bigIntFrom(trimLeadingZeros(randomBytes(randomInt(1, 32)))),
					])
				),
			];
			test(`#${i} x ${storage.length}`, async () => {
				const contract = await F.deploy(`contract X {
					constructor() {
						assembly {
							${storage.map(([k, v]) => `sstore(${k}, ${v})`).join("\n")}
						}
					}	
				}`);
				const storageHash = await getStorageHash(F.provider, contract.target);
				const node = storage.reduce<MaybeNode>(
					(node, [k, x]) =>
						insertNode(
							node,
							toNibblePath(keccak256(bytesFrom(k, 32))),
							bytesFrom(x)
						),
					undefined
				);
				try {
					expect(toHex(getRootHash(node))).toStrictEqual(storageHash);
				} catch {
					console.log(
						Object.fromEntries(
							[...storage].map((x) => x.map((y) => "0x" + y.toString(16)))
						)
					);
				}
			});
		}
	});

	describe("bytes", () => {
		for (let i = 0; i < N; ++i) {
			test(`bytes #${i}`, async () => {
				const contract = await F.deploy(`contract X {
					struct S { bytes v; }
					function set(bytes32[] calldata ks, bytes[] calldata vs) external {
						S storage s;
						for (uint256 i; i < ks.length; ++i) {
							bytes32 slot = ks[i];
							assembly { s.slot := slot }
							s.v = vs[i];
						}
					}
				}`);
				const storage = Array.from({ length: randomInt(1, 50) }, () => [
					randomBytes(32),
					randomBytes(randomInt(0, 100)),
				]);
				await F.confirm(
					contract.set(
						storage.map((x) => x[0]),
						storage.map((x) => x[1])
					)
				);
				const storageHash = await getStorageHash(F.provider, contract.target);
				const node = storage.reduce<MaybeNode>(
					(a, [k, v]) => insertBytes(a, k, v),
					undefined
				);
				expect(toHex(getRootHash(node))).toStrictEqual(storageHash);
			});
		}
	});
});
