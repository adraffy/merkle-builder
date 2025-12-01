# merkle-builder

* Low-level Merkle-Patricia storage trie implementation
* Matches Ethereum RPC and Foundry results
* Memory efficient (copy-on-write, shared subexpressions)
* Compute efficient (branch nodes hash once)

### Test

1. `foundryup`
1. `forge i`
1. `bun i`
1. `bun test`

### Scripts

* `bun run fuzz`
* `bun run demo` &mdash; replicate `eth_getProof` for [L2ReverseRegistrar](https://optimistic.etherscan.io/address/0x0000000000D8e504002cC26E3Ec46D81971C1664) on Optimism
