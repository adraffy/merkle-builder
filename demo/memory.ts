import { Database } from "bun:sqlite";
import { insertBytes } from "../src/kv.js";
import { toHex } from "../src/utils.js";
import { copyNode, getRootHash, type MaybeNode } from "../src/trie.js";
import { getPrimarySlot } from "./registrar.js";
import { getByteCount, getNodeCount } from "../src/inspect.js";
import { Coder } from "../src/coder.js";
import { graftLimb, pluckLimbs } from "../src/surgery.js";

const chainName = "base"; // 'optimism';

const db = new Database(`${import.meta.dir}/${chainName}.sqlite`);

let node: MaybeNode = undefined;
console.time("rebuildTrie");
for (const row of db
	.query<
		{
			addr: Uint8Array;
			name: Uint8Array;
		},
		[]
	>("SELECT * FROM names ORDER BY rowid")
	.iterate()) {
	node = insertBytes(node, getPrimarySlot(toHex(row.addr)), row.name);
}
console.timeEnd("rebuildTrie");

console.log(`NodeCount: ${getNodeCount(node)}`);
console.log(`ByteCount: ${getByteCount(node)}`);

console.time("getRootHash");
const storageHash = toHex(getRootHash(node));
console.timeEnd("getRootHash");
console.log(`StorageHash: ${storageHash}`);

console.log(`ByteCount: ${getByteCount(node)}`);

const { trunk, limbs } = pluckLimbs(node, 2);
console.log(`LimbCount: ${limbs.length}`);
console.log([], getEncodedNodeSize(trunk));
for (const [path, limb] of limbs) {
	console.log([...path], getEncodedNodeSize(limb));
}

const copy = limbs.reduce((a, x) => graftLimb(a, ...x), copyNode(trunk));

console.log(toHex(getRootHash(copy)) === storageHash);

function getEncodedNodeSize(node: MaybeNode) {
	const c = new Coder();
	c.writeNode(node, true);
	return c.pos;
}
