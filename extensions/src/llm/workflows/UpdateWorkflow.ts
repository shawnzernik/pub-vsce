import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Config } from "../../config";
import { parseFileFencedBlocks } from "./MarkdownFencedParser";

interface UpdateFile extends File {
	action: "add" | "edit" | "delete";
}

export class UpdateWorkflow extends WorkflowBase {
	public static create(
		config: Config,
		repository: Repository,
		updater: (me: WorkflowBase) => void = () => { }
	): UpdateWorkflow {
		return new UpdateWorkflow(config, repository, updater);
	}

	protected override async execute(): Promise<void> {
		if (!this.request) throw new Error("Request not initialized");

		const total = await this.step2Files();

		for (let i = 1; i <= total; i++) {
			const stepResult = await this.step3Contents(i);

			if (!stepResult || !stepResult.file)
				throw new Error(`Step ${i} did not return a file result!`);

			const file = stepResult.file;

			if (!stepResult.handled) {
				if (file.action === "delete")
					this.repository.write(file.name, null);
				else
					this.repository.write(file.name, file.contents as string);
			}

			if (file.contents === null)
				break;
		}

		const stopJsonPrompt = await this.readBundledPrompt("update/999-done.md");
		await this.sendUserMessage(stopJsonPrompt);
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

	private async step3Contents(counter: number): Promise<{ file?: UpdateFile; handled?: boolean }> {
		const userPrompt = (await this.readBundledPrompt("update/003-contents.md")).replace(/{{counter}}/g, counter.toFixed());

		for (let attempt = 1; attempt <= 2; attempt++) {
			const text = await this.sendUserMessage(userPrompt);
			let jsonText: string | undefined;
			const blocks = parseFileFencedBlocks(text);

			if (blocks.length > 0)
				jsonText = blocks[0]?.contents?.trim() ?? "";
			else {
				// Extract first fenced code block (` ```json ... ``` ` or `~~~ ... ~~~`) or fallback to raw text
				const m =
					/(?:^|\n)([`~]{3,})(?:json|javascript|js)?\s*\n([\s\S]*?)\n\1/.exec(text) ||
					/(?:^|\n)([`~]{3,})\s*\n([\s\S]*?)\n\1/.exec(text);
				jsonText = (m && m[2] !== undefined ? m[2] : text).trim();
			}

			try {
				const parsed = JSON.parse(jsonText);
				if (
					typeof parsed !== "object" ||
					typeof parsed.name !== "string" ||
					!(["add", "edit", "delete"] as string[]).includes(parsed.action)
				)
					throw new Error("Parsed JSON missing required fields 'name' or 'action'");

				if (parsed.action === "delete")
					return { file: { name: parsed.name, contents: "", action: parsed.action }, handled: false };

				if (typeof parsed.contents !== "string")
					throw new Error("Missing or invalid 'contents' field for add/edit action");

				return { file: { name: parsed.name, contents: parsed.contents, action: parsed.action }, handled: false };
			} catch (err) {
				if (attempt === 2) {
					throw new Error(`Failed to parse JSON response on step ${counter}: ${(err as Error).message}`);
				}

				let fixPrompt = await this.readBundledPrompt("update/003-contents.md");
				fixPrompt = fixPrompt.replace(/{{text}}/g, text);

				await this.sendUserMessage(fixPrompt);
			}
		}

		return {};
	}
}
