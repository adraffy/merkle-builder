import { Contract, EventLog, JsonRpcProvider } from "ethers";
import { readFile, writeFile } from "node:fs/promises";
import {
	EMPTY_BYTES,
	findLeaf,
	getProof,
	getRootHash,
	toNibblePath,
	type MaybeNode,
} from "../../src/trie.js";
import { insertBytes } from "../../src/kv.js";
import { followSlot, keccak256, toBytes, toHex } from "../../src/utils.js";
import { ethGetProof, type EthGetProof } from "../rpc.js";

const realProvider = new JsonRpcProvider(
	`https://lb.drpc.live/optimism/${process.env.DRPC_KEY}`,
	10,
	{ staticNetwork: true, batchMaxCount: 3 }
);

const cacheFile = new URL("./cache.json", import.meta.url);

// https://optimistic.etherscan.io/address/0x0000000000D8e504002cC26E3Ec46D81971C1664
const REGISTRAR = "0x0000000000D8e504002cC26E3Ec46D81971C1664";
const registrar = new Contract(
	REGISTRAR,
	["event NameForAddrChanged(address indexed addr, string name)"],
	realProvider
);

let block0 = 137403854; // deployed
let node: MaybeNode = undefined;
const names: [string, string][] = [];
try {
	const json = JSON.parse(await readFile(cacheFile, "utf8"));
	block0 = json.block0;
	for (const [name, addr] of json.names) {
		register(name, addr);
	}
} catch {}

function getPrimarySlot(addr: string) {
	return followSlot(0n, toBytes(addr, 32));
}

function register(addr: string, name: string) {
	node = insertBytes(node, getPrimarySlot(addr), Buffer.from(name));
	names.push([addr, name]);
	console.log(`${addr} = ${name}`);
}

await sync();

registrar.on("NameForAddrChanged", register);

const port = 8000;
console.log(`Ready on ${port}`);

Bun.serve({
	port,
	async fetch(req) {
		let id = 1;
		let slots: Uint8Array[];
		try {
			const json: any = await req.json();
			if (typeof json !== "object") {
				throw new Error("expected object");
			}
			id = json.id;
			if (!Number.isSafeInteger(id)) {
				throw new Error("expected id");
			}
			if (json.method !== "eth_getProof") {
				throw new Error("expected eth_getProof");
			}
			if (!Array.isArray(json.params) || json.params.length !== 3) {
				throw new Error("expected params");
			}
			const [address, hexSlots, blockTag] = json.params;
			if (
				REGISTRAR.localeCompare(address, undefined, { sensitivity: "base" })
			) {
				throw new Error(`expected ${REGISTRAR}`);
			}
			if (!Array.isArray(hexSlots)) {
				throw new Error(`expected slots`);
			}
			slots = hexSlots.map((x) => toBytes(x, 32));
			if (blockTag !== "latest") {
				throw new Error("expected latest blockTag");
			}
		} catch (err: any) {
			return Response.json({
				id,
				error: err?.message ?? String(err),
			});
		}
		const storageHash = toHex(getRootHash(node));
		const storageProof = slots.map((slot) => {
			const path = toNibblePath(keccak256(slot));
			return {
				key: toHex(slot),
				value: toHex(findLeaf(node, path)?.value ?? EMPTY_BYTES),
				proof: getProof(node, path).map((v) => toHex(v)),
			};
		});
		const result = {
			address: REGISTRAR.toLowerCase(),
			storageHash,
			storageProof,
		} satisfies EthGetProof;
		return Response.json({ id, result });
	},
});

const fakeProvider = new JsonRpcProvider(`http://localhost:${port}`, 1, {
	staticNetwork: true,
	batchMaxCount: 1,
});

const slots = [getPrimarySlot("0x69420f05A11f617B4B74fFe2E04B2D300dFA556F")];

const realProof = await ethGetProof(realProvider, REGISTRAR, slots);
const fakeProof = await ethGetProof(fakeProvider, REGISTRAR, slots);

console.log(extract(realProof) === extract(fakeProof));

function extract({ storageHash, storageProof }: EthGetProof) {
	return JSON.stringify({ storageHash, storageProof });
}

async function sync() {
	while (true) {
		const t0 = Date.now();
		const MAX_LOGS = 10000;
		let block1 = await realProvider.getBlockNumber();
		while (block0 < block1) {
			const block = Math.min(block1, block0 + MAX_LOGS - 1);
			const logs = await registrar.queryFilter(
				registrar.filters.NameForAddrChanged(),
				block0,
				block
			);
			const node0 = node;
			for (const log of logs) {
				if (log instanceof EventLog) {
					register(log.args.addr, log.args.name);
				}
			}
			block0 = block;
			if (node !== node0) {
				await save();
			}
		}
		if (Date.now() - t0 < 1000) break;
	}
	await save();
}

async function save() {
	await writeFile(cacheFile, JSON.stringify({ block0, names }, undefined, '\t'));
	console.log(`Saved: ${names.length}`);
}
