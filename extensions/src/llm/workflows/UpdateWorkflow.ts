import { Request } from "@lvt/aici-library/dist/llm/Request";
import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Config } from "../../config";
import { parseFileFencedBlocks } from "./MarkdownFencedParser";

export class UpdateWorkflow extends WorkflowBase {
	public static create(
		config: Config,
		repository: Repository,
		updater: (me: WorkflowBase) => void = () => { }
	): UpdateWorkflow {
		return new UpdateWorkflow(config, repository, updater);
	}

	protected override async execute(request: Request): Promise<Request> {
		this.request = request;

		try {
			const total = await this.step2Files();

			for (let i = 1; i <= total; i++) {
				const stepResult = await this.step3Contents(i);

				if (!stepResult || !stepResult.file)
					throw new Error(`Step ${i} did not return a file result!`);

				const file = stepResult.file;

				if (!stepResult.handled) {
					this.repository.write(file.name, file.contents);
				}

				if (file.contents === null)
					break;
			}

			return this.request;
		} catch (err) {
			const errorText =
				`Workflow error:\n\n` +
				`${(err as Error)?.message || String(err)}` +
				`\n\nPlease fix the issue and retry.`;
			this.request.messages.push({ role: "assistant", content: errorText });
			return this.request;
		}
	}

	private async step2Files(): Promise<number> {
		const prompt = await this.readBundledPrompt("update/002-file-list.md");
		const text = (await this.sendUserMessage(prompt)).trim();

		let m = /Total number of items in list:\s*(\d+)\b/i.exec(text);
		if (!m)
			m = /Total number of items in list\b[\s\S]*?(\d+)/i.exec(text);

		if (!m) {
			const snippet = text.length > 1000 ? text.slice(0, 1000) + "..." : text;
			throw new Error(
				`Could not detect 'Total number of items in list: #.' Response snippet:\n${snippet}`
			);
		}
		return Number.parseInt(m[1] || "0", 10);
	}

	private async step3Contents(counter: number): Promise<{ file?: File; handled?: boolean }> {
		let prompt = await this.readBundledPrompt("update/003-contents.md");
		prompt = prompt.replace(/{{counter}}/g, counter.toFixed());
		const text = await this.sendUserMessage(prompt);

		const deleteMatch = /Delete(?:\s+File)?\s+`([^`]+)`/i.exec(text);
		if (deleteMatch && deleteMatch[1]) {
			const delPath = deleteMatch[1];
			try {
				this.repository.write(delPath, null);
			} catch (err) {
				throw new Error(`Failed to delete file '${delPath}': ${String((err as any)?.message || err)}`);
			}
			return { file: { name: delPath, contents: "" }, handled: true };
		}

		const blocks = parseFileFencedBlocks(text);
		if (!blocks || blocks.length === 0) {
			this.appendFileParseError(
				counter,
				"Could not locate file name and contents in the response. Please provide the full, corrected file contents in a single fenced block using the absolute repository-relative path without any URI scheme, like:\n\n`File `src/path/to/file.ext`:`"
			);
			throw new Error("Could not locate file name and contents!");
		}

		const first = blocks[0];
		if (!first || !first.name || first.contents === undefined) {
			this.appendFileParseError(
				counter,
				"Could not locate file name and contents in the response. Please provide the full, corrected file contents in a single fenced block using the absolute repository-relative path without any URI scheme, like:\n\n`File `src/path/to/file.ext`:`"
			);
			throw new Error("Could not locate file name and contents!");
		}

		return { file: { name: first.name, contents: first.contents }, handled: false };
	}

	private appendFileParseError(step: number, output: string): void {
		if (!this.request) return;

		const text = [
			`The assistant response for step ${step} did not include a valid full-file fenced block (required).`,
			"",
			"Error details:",
			"```",
			(output || "(no output)").trim(),
			"```",
			"",
			"Please respond with the complete, corrected file contents in a single fenced block. Include the repository-relative path in the header like:",
			"",
			"`File \`src/path/to/file.ext\`:`",
			"",
			"Ensure the fenced block uses a run of backticks longer than any backtick runs in the file contents.",
		].join("\n");

		this.request.messages.push({ role: "user", content: text });
		this.request.messages.push({ role: "assistant", content: "" });
	}
}