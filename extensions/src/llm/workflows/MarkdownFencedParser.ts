export interface ParsedFileBlock {
	name: string;
	info: string;
	contents: string;
}

export function parseFileFencedBlocks(markdown: string): ParsedFileBlock[] {
	const results: ParsedFileBlock[] = [];
	if (!markdown) return results;

	const headerRe = /File\s+`([^`]+)`:\s*/g;
	let headerMatch: RegExpExecArray | null;

	while ((headerMatch = headerRe.exec(markdown)) !== null) {
		const name = headerMatch[1];
		const afterHeaderIndex = headerMatch.index + headerMatch[0].length;

		// Slice from after header and skip leading whitespace/newlines.
		const afterHeaderSlice = markdown.slice(afterHeaderIndex);
		const leadingWsMatch = afterHeaderSlice.match(/^\s*/);
		const leadingLen = leadingWsMatch ? leadingWsMatch[0].length : 0;
		const searchStart = afterHeaderIndex + leadingLen;
		const remaining = markdown.slice(searchStart);

		// Find an opening fence on a line: sequence of backticks or tildes, length >= 3.
		// Capture full fence string and any trailing info (lang or similar).
		const openFenceRe = /^([`~]{3,})([^\r\n]*)\r?\n?/m;
		const openMatch = openFenceRe.exec(remaining);
		if (!openMatch) {
			// No opening fence after header -> skip
			continue;
		}

		const fullFence = openMatch[1] || "";
		const info = (openMatch[2] || "").trim();

		// Compute where content starts in the original markdown
		const contentStartIndex = searchStart + (openMatch.index ?? 0) + openMatch[0].length;

		// Walk lines from contentStartIndex to find closing fence that exactly matches fullFence
		const afterOpen = markdown.slice(contentStartIndex);
		const lines = afterOpen.split(/\r?\n/);

		let offset = 0; // characters consumed from afterOpen
		let foundClose = false;
		const contentLines: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] ?? "";
			// Check for exact closing fence match (trimmed)
			if (line.trim() === fullFence) {
				// account for closing fence line length
				offset += line.length;
				foundClose = true;
				break;
			}
			// Accumulate content line and account for newline that was removed by split
			contentLines.push(line);
			offset += line.length + 1; // +1 approximates the removed newline
		}

		if (!foundClose) {
			// No matching closing fence -> ignore this header (defensive)
			continue;
		}

		const contents = contentLines.join("\n");
		results.push({ name: name!, info, contents });

		// Advance headerRe.lastIndex to the end of the closing fence to avoid re-matching inside the fenced block.
		const closingFenceStart = contentStartIndex + offset;
		const closingFenceEnd = closingFenceStart + fullFence.length;
		// Move past the closing fence (and one char to be safe)
		headerRe.lastIndex = Math.max(headerRe.lastIndex, closingFenceEnd + 1);
	}

	return results;
}