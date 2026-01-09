import { Database } from "bun:sqlite";
import { deepEquals } from "bun";
import { Coder } from "../src/coder.js";
import { insertBytes } from "../src/kv.js";
import { keccak256, toHex, type Hex } from "../src/utils.js";
import {
	copyNode,
	findLeaf,
	getProof,
	getRootHash,
	toNibblePath,
	type MaybeNode,
} from "../src/trie.js";
import { getPrimarySlot, KNOWN_ADDRS } from "./registrar.js";
import { getByteCount, getNodeCount } from "../src/inspect.js";
import { graftLimb, pluckLimbs } from "../src/surgery.js";

const chainName = "base"; // 'optimism', 'arbitrum';

const db = new Database(`${import.meta.dir}/${chainName}.sqlite`);

let node: MaybeNode;
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

// prehash
console.time("getRootHash");
const storageHash = toHex(getRootHash(node));
console.timeEnd("getRootHash");
console.log(`StorageHash: ${storageHash}`);

console.log(`ByteCount: ${getByteCount(node)}`);

// split
const DEPTH = 2;
const { trunk, limbs } = pluckLimbs(copyNode(node), DEPTH);
console.log(`LimbCount: ${limbs.length}`);
console.log(`Trunk Size: ${getEncodedNodeSize(trunk)}`);
console.log(
	`Max Limb Size: ${limbs.reduce(
		(a, x) => Math.max(a, getEncodedNodeSize(x[1])),
		0
	)}`
);

// join
const copy = limbs.reduce((a, x) => graftLimb(a, ...x), copyNode(trunk));
console.log(`Copy Hash: ${toHex(getRootHash(copy)) === storageHash}`);

// in-memory
const mem = new Database();
mem.run(`CREATE TABLE limbs (key STRING PRIMARY KEY, value BLOB)`);
const select = mem.prepare<{ value: Uint8Array }, string>(
	"SELECT value FROM limbs WHERE key = ?"
);
const insert = mem.prepare<void, [string, Uint8Array]>(
	"INSERT INTO limbs (key,value) VALUES(?,?)"
);
mem.transaction(() => {
	const c = new Coder();
	c.writeNode(trunk);
	insert.run("", c.bytes);
	for (const [path, limb] of limbs) {
		c.reset();
		c.writeNode(limb);
		insert.run(storageKey(path), c.bytes);
	}
})();
console.log(
	`Memory: ${
		mem
			.query(
				`SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()`
			)
			.values()[0][0]
	}`
);

for (const addr of KNOWN_ADDRS) {
	console.log();
	lookup(addr, false);
	lookup(addr, true);
}

function lookup(address: Hex, loadTrunk: boolean) {
	console.time("lookup");
	let temp = loadTrunk
		? new Coder(select.get("")!.value).readNode()
		: copyNode(trunk);
	const slot = getPrimarySlot(address);
	const path = toNibblePath(keccak256(slot));
	const part = path.subarray(0, DEPTH);
	const limb = select.get(storageKey(part))?.value;
	if (limb) {
		temp = graftLimb(temp, part, new Coder(limb).readNode()!);
	}
	console.log({
		loadTrunk,
		address,
		path: storageKey(path),
		hasLimb: !!limb,
		sameProof: deepEquals(getProof(temp, path), getProof(node, path)),
		sameLeaf: deepEquals(findLeaf(temp, path), findLeaf(node, path)),
		sameHash: toHex(getRootHash(temp)) === storageHash,
	});
	console.timeEnd("lookup");
}

function storageKey(path: Uint8Array) {
	return Array.from(path, (x) => x.toString(16)).join("");
}

function getEncodedNodeSize(node: MaybeNode) {
	const c = new Coder();
	c.writeNode(node);
	return c.pos;
}
