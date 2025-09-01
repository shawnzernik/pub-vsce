export class Uuid {
	public static asString(): string {
		const bytes = Uuid.asUint8Array();

		if (bytes[6] === undefined || bytes[8] === undefined) {
			throw new Error("Byte 6 or 8 undefined!");
		}

		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;

		const hex = Uuid.toHex(bytes);

		return [
			hex.slice(0, 4).join(""),
			hex.slice(4, 6).join(""),
			hex.slice(6, 8).join(""),
			hex.slice(8, 10).join(""),
			hex.slice(10).join("")
		].join("-");
	}

	public static asUint8Array(): Uint8Array {
		const result = new Uint8Array(16);

		for (let i = 0; i < result.length; i++)
			result[i] = Math.floor(Math.random() * 256);

		return result;
	}

	private static toHex(bytes: Uint8Array): string[] {
		return Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
	}
}
