import { type Hex, toHex } from "../src/utils.js";

interface Provider {
	send(method: string, params: any[]): Promise<any>;
}

export type EthStorageProof = {
	key: Hex;
	value: Hex;
	proof: Hex[];
};
export type EthGetProof = {
	address: Hex;
	storageHash: Hex;
	storageProof: EthStorageProof[];
};

// partial eth_getProof helper
export async function ethGetProof(
	provider: Provider,
	address: string,
	slots: Uint8Array[] = [],
	blockTag = "latest"
): Promise<EthGetProof> {
	return provider.send("eth_getProof", [address, slots.map(toHex), blockTag]);
}

export async function ethGetStorage(
	provider: Provider,
	address: string,
	slot: Uint8Array,
	blockTag = "latest"
): Promise<Hex> {
	return provider.send("eth_getStorageAt", [address, toHex(slot), blockTag]);
}
