import { toHex } from "../src/utils.js";

export type EthStorageProof = {
	key: string;
	value: string;
	proof: string[];
};
export type EthGetProof = {
	address: string;
	storageHash: string;
	storageProof: EthStorageProof[];
};

// partial eth_getProof helper
export async function ethGetProof(
	provider: { send(address: string, params: any[]): Promise<any> },
	address: string,
	slots: Uint8Array[] = [],
	blockTag = "latest"
): Promise<EthGetProof> {
	return provider.send("eth_getProof", [address, slots.map(toHex), blockTag]);
}
