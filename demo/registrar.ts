import { insertLeaf, toNibblePath, type MaybeNode } from "../src/trie.js";
import { followSlot, keccak256, toBytes, type Hex } from "../src/utils.js";

// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/reverseRegistrar/StandaloneReverseRegistrar.sol
// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/reverseRegistrar/L2ReverseRegistrar.sol
// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/reverseRegistrar/L2ReverseRegistrarWithMigration.sol

const SLOT_NAMES = 0n;
const SLOT_OWNER = 1n;

const OWNER_PATH = toNibblePath(keccak256(toBytes(SLOT_OWNER, 32)));

export function setOwner(node: MaybeNode, owner: Hex): MaybeNode {
	return insertLeaf(node, OWNER_PATH, toBytes(owner));
}

export function getPrimarySlot(addr: Hex) {
	return followSlot(SLOT_NAMES, toBytes(addr, 32));
}

export const KNOWN_ADDRS = [
	"0x69420f05A11f617B4B74fFe2E04B2D300dFA556F", // tate
	"0x51050ec063d393217B436747617aD1C2285Aeeee", // raffy
	"0x000000000000000000000000000000000000beef", // dne
] as const;
