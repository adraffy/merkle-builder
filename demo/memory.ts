import { Database } from "bun:sqlite";
import { increment, insertBytes } from "../src/kv.js";
import { toHex } from "../src/utils.js";
import { extractNode, getRootHash, insertNode, type MaybeNode } from "../src/trie.js";
import { getPrimarySlot } from "./registrar.js";
import { byteCount, nodeCount } from "../src/inspect.js";
import { Coder } from "../src/coder.js";

const chainName = 'base'; // 'optimism';

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

console.log(`NodeCount: ${nodeCount(node)}`);
console.log(`ByteCount: ${byteCount(node)}`);

console.time("getRootHash");
const storageHash = toHex(getRootHash(node));
console.timeEnd("getRootHash");
console.log(`StorageHash: ${storageHash}`);

console.log(`ByteCount: ${byteCount(node)}`);

const path = new Uint8Array(2); // => 16**2 == 256 shards
const coder = new Coder();
let copy = undefined;
let shards = 0;
do {
    const part = extractNode(node, path);
    if (part) {
        copy = insertNode(copy, path, part);
        coder.pos = 0;
        coder.writeNode(part, true);
        console.log([...path], coder.pos);
        ++shards;
    }
} while (increment(path, 15))

console.log(toHex(getRootHash(copy)) === storageHash);
console.log(shards);
