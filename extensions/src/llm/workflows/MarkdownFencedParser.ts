export interface ParsedFileBlock {
	name: string;
	info: string;
	contents: string;
}

export function parseFileFencedBlocks(markdown: string): ParsedFileBlock[] {
	const results: ParsedFileBlock[] = [];
	if (!markdown)
		return results;

	const headerRe = /File\s+`([^`]+)`:\s*/g;
	let headerMatch: RegExpExecArray | null;

	while ((headerMatch = headerRe.exec(markdown)) !== null) {
		const name = headerMatch[1];
		let afterHeaderIndex = headerMatch.index + headerMatch[0].length;

		// Skip any number of blank lines (whitespace + newlines) after the header
		const afterHeaderSlice = markdown.slice(afterHeaderIndex);
		const blankLinesMatch = afterHeaderSlice.match(/^(\s*\r?\n)*/);
		const leadingLen = blankLinesMatch ? blankLinesMatch[0].length : 0;
		afterHeaderIndex += leadingLen;

		const remaining = markdown.slice(afterHeaderIndex);

		// Match opening fence with optional info string (including empty)
		const openFenceRe = /^([`~]{3,})([^\r\n]*)\r?\n?/m;
		const openMatch = openFenceRe.exec(remaining);
		if (!openMatch) {
			continue;
		}

		const fullFence = openMatch[1] || "";
		const info = (openMatch[2] || "").trim();

		const contentStartIndex = afterHeaderIndex + (openMatch.index ?? 0) + openMatch[0].length;

		const afterOpen = markdown.slice(contentStartIndex);
		const lines = afterOpen.split(/\r?\n/);

		let offset = 0;
		let foundClose = false;
		const contentLines: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i] ?? "";
			if (line.trim() === fullFence) { // match exact fence ignoring trailing whitespace
				offset += line.length;
				foundClose = true;
				break;
			}
			contentLines.push(line);
			offset += line.length + 1;
		}

		if (!foundClose) {
			continue;
		}

		const contents = contentLines.join("\n");
		results.push({ name: name!, info, contents });

		const closingFenceStart = contentStartIndex + offset;
		const closingFenceEnd = closingFenceStart + fullFence.length;
		headerRe.lastIndex = Math.max(headerRe.lastIndex, closingFenceEnd + 1);
	}

	return results;
}