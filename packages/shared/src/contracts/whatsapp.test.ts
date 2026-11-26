import { describe, expect, it } from "vitest";

import { formatPhone, normalizePhone } from "./whatsapp";

describe("whatsapp phone helpers", () => {
	it("formats Mozambican numbers given as text or number", () => {
		expect(formatPhone("258833204038")).toBe("+258 83 320 4038");
		expect(formatPhone(258833204038)).toBe("+258 83 320 4038");
		expect(formatPhone("351912345678")).toBe("+351912345678");
	});

	it("normalizes local and international input", () => {
		expect(normalizePhone("84 123 4567")).toBe("258841234567");
		expect(normalizePhone("+258 84 123 4567")).toBe("258841234567");
		expect(normalizePhone("00258841234567")).toBe("258841234567");
		expect(normalizePhone("123")).toBeNull();
	});
});
