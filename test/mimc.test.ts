import { afterAll, describe, expect, test } from "bun:test";
import { Foundry } from "@adraffy/blocksmith";
import { mimcHash } from "../src/mimc.js";
import { concat, toHex } from "../src/utils.js";
import { randomBytes } from "./utils.js";

describe("mimc", async () => {
	const F = await Foundry.launch();
	afterAll(F.shutdown);

	const Mimc = await F.deploy({ file: "Mimc" });

	for (let length = 1; length <= 5; ++length) {
        describe(`length = ${length}`, () => {
            for (let i = 0; i < 10; i++) {
                const m = Array.from({ length }, () => randomBytes(32));
                test(`#${i}`, async () => {
                    expect(
                        mimcHash(m.map((x) => BigInt(toHex(x)))),
                        String(m.map(toHex))
                    ).toBe(BigInt(await Mimc.hash(concat(...m))));
                });
            }
        });
	}
});
