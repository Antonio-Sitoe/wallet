import { describe, expect, it } from "vitest";

import { createFailureLimiter, parseBasic } from "./basic-auth";

const encode = (text: string) =>
	`Basic ${Buffer.from(text).toString("base64")}`;

describe("parseBasic", () => {
	it("reads email and password", () => {
		expect(parseBasic(encode("Me@Example.test:pa:ss"))).toEqual({
			email: "me@example.test",
			password: "pa:ss",
		});
	});

	it("ignores other schemes and malformed values", () => {
		expect(parseBasic("Bearer abc")).toBeNull();
		expect(parseBasic(encode("no-separator"))).toBeNull();
		expect(parseBasic(encode(":password"))).toBeNull();
		expect(parseBasic(undefined)).toBeNull();
	});
});

describe("createFailureLimiter", () => {
	it("blocks after five failures within a minute and forgets after it", () => {
		let now = 0;
		const limiter = createFailureLimiter(() => now);
		const keys = ["ip:1", "email:a"];
		for (let i = 0; i < 5; i++) limiter.fail(keys);
		expect(limiter.blocked(keys)).toBe(true);
		expect(limiter.blocked(["ip:1"])).toBe(true);
		expect(limiter.blocked(["ip:2"])).toBe(false);
		now = 61_000;
		expect(limiter.blocked(keys)).toBe(false);
	});

	it("resets on success", () => {
		const limiter = createFailureLimiter(() => 0);
		for (let i = 0; i < 4; i++) limiter.fail(["k"]);
		limiter.reset(["k"]);
		limiter.fail(["k"]);
		expect(limiter.blocked(["k"])).toBe(false);
	});
});
