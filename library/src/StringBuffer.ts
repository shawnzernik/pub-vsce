/**
 * Simple growable string buffer.
 *
 * API:
 *  - append(...values: string[]): void
 *  - appendLine(...values: string[]): void
 *  - toString(): string
 *  - clear(): void
 *
 * Implementation detail: uses an internal array of parts for efficient concatenation.
 */
export class StringBuffer {
	private parts: string[] = [];

	/**
	 * Append one or more string fragments to the buffer.
	 */
	public append(...values: string[]): void {
		this.parts.push(...values);
	}

	/**
	 * Append one or more string fragments followed by a newline.
	 */
	public appendLine(...values: string[]): void {
		this.parts.push(...values, "\n");
	}

	/**
	 * Return the concatenated string.
	 */
	public toString(): string {
		return this.parts.join('');
	}

	/**
	 * Clear the buffer.
	 */
	public clear(): void {
		this.parts = [];
	}
}
