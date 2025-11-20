import { inspect } from "bun";
import type { MaybeNode } from "../src/trie.js";
import type { JsonRpcApiProvider } from "ethers/providers";

export function dump(node: MaybeNode) {
	console.log(inspect(node, { depth: Infinity, colors: true }));
}

export async function getStorageHash(
	provider: JsonRpcApiProvider,
	address: string
) {
	const proof: { storageHash: string } = await provider.send("eth_getProof", [
		address,
		[],
		"latest",
	]);
	return proof.storageHash;
}
