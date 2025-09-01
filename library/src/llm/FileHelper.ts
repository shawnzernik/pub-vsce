import { File } from "./File";

/**
 * FileHelper - small utilities for serializing File DTOs to Markdown.
 */
export class FileHelper {
	/**
	 * Render a File as a markdown block with a header and fenced code block.
	 * Chooses an outer fence that is guaranteed to be longer than any run of
	 * backticks inside the file contents so we don't need to escape interior backticks.
	 */
	public static toMarkdown(file: File): string {
		const header = `File \`${file.name}\`:\n\n`;
		const contents = file.contents || "";

		// Find runs of consecutive backticks and determine the maximum length.
		const runs = contents.match(/`+/g);
		const maxRun = runs && runs.length > 0 ? Math.max(...runs.map(r => r.length)) : 0;

		// Fence length must be at least 3 per Markdown spec. Use N+1 so any interior
		// run of N backticks will not close the outer fence.
		const fenceLen = Math.max(3, maxRun + 1);
		const fence = "`".repeat(fenceLen);

		// Build fenced block with a trailing newline after content and after the closing fence.
		const block = `${fence}\n${contents}\n${fence}\n`;

		return header + block;
	}
}