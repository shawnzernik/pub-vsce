import { Request } from "@lvt/aici-library/dist/llm/Request";
import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Connection } from "../openai/Connection";
import { Config } from "../../config";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";
import { NoninteractiveShell } from "../../system/NoninteractiveShell";
import { parseFileFencedBlocks } from "./MarkdownFencedParser";

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export class UpdateWorkflow extends WorkflowBase {
	public static create(config: Config, repository: Repository, updater: (me: WorkflowBase) => void = () => { }): UpdateWorkflow {
		return new UpdateWorkflow(config, repository, updater);
	}

	protected override async execute(request: Request): Promise<Request> {
		this.request = JsonHelper.copy<Request>(request);

		// await this.step1Summarize();
		const total = await this.step2Files();

		for (let i = 1; i <= total; i++) {
			const attempts = Math.max(1, Number(this.config.updateRetries ?? 3));

			for (let attempt = 1; attempt <= attempts; attempt++) {
				let stepResult: { file?: File; handled?: boolean } | undefined;

				try {
					stepResult = await this.step3Contents(i);
				} catch (err) {
					if (attempt === attempts)
						throw new Error(`Step ${i} failed after ${attempts} attempts.\n${String((err as Error)?.message || err)}`);
					continue;
				}

				if (!stepResult || !stepResult.file)
					throw new Error(`Step ${i} did not return a file result!`);

				const file = stepResult.file;

				if (!stepResult.handled) {
					this.repository.write(file.name, file.contents);
				}

				if (file.contents === null)
					break;

				if (!this.isCommand(file))
					break;

				const result = await this.execCommand(file);
				if (result.ok)
					break;

				this.appendExecError(i, file.name, result.code, result.output);

				if (attempt === attempts)
					throw new Error(`Command file '${file.name}' failed after ${attempts} attempts (exit ${result.code}).\n${result.output}`);
			}
		}

		return this.request;
	}

	private async readBundledPrompt(relPath: string): Promise<string> {
		try {
			const ext = vscode.extensions.getExtension("LagoVistaTechnologies.aici");
			if (ext && ext.extensionPath) {
				const candidates = [
					path.join(ext.extensionPath, "dist", "llm", "workflows", "prompts", relPath),
					path.join(ext.extensionPath, "src", "llm", "workflows", "prompts", relPath),
					path.join(ext.extensionPath, "llm", "workflows", "prompts", relPath),
				];
				for (const cand of candidates) {
					try {
						if (fs.existsSync(cand)) {
							return fs.readFileSync(cand, "utf8");
						}
					} catch {
					}
				}
			}
		} catch {
		}

		try {
			const repoPath = `extensions/src/llm/workflows/prompts/${relPath}`;
			return this.repository.read(repoPath);
		} catch {
		}

		throw new Error(`Could not locate bundled prompt '${relPath}' in extension package or workspace.`);
	}

	// private async step1Summarize(): Promise<void> {
	// 	if (!this.request)
	// 		throw new Error("Request is invalid!");

	// 	const prompt = await this.readBundledPrompt("update/001-summarize.md");
	// 	this.request.messages.push({ role: "user", content: prompt });
	// 	this.request.messages.push({ role: "assistant", content: "" });

	// 	const baseReq = this.metrics.requestTokens || 0;
	// 	const baseResp = this.metrics.responseTokens || 0;
	// 	const baseSeconds = this.metrics.seconds || 0;
	// 	const stepStart = Date.now();

	// 	const connection = new Connection(
	// 		this.config.aiUrl,
	// 		this.config.aiKey,
	// 		(conn) => {
	// 			if (this.request) {
	// 				const last = this.request.messages.length - 1;
	// 				this.request.messages[last] = conn.response.message;
	// 			}
	// 			this.metrics.requestTokens = baseReq + (conn.response.metrics.requestTokens || 0);
	// 			this.metrics.responseTokens = baseResp + (conn.response.metrics.responseTokens || 0);
	// 			this.metrics.seconds = baseSeconds + (Date.now() - stepStart) / 1000;
	// 			this.updated(this);
	// 		},
	// 		{ retries: this.config.aiRetries ?? 3, retryDelaySeconds: this.config.aiRetryDelaySeconds ?? 10 }
	// 	);

	// 	await connection.send(this.request);
	// 	if (connection.response.status === "error")
	// 		throw new Error("The last response was in error!");
	// }

	private async step2Files(): Promise<number> {
		if (!this.request)
			throw new Error("Request is invalid!");

		const prompt = await this.readBundledPrompt("update/002-file-list.md");
		this.request.messages.push({ role: "user", content: prompt });
		this.request.messages.push({ role: "assistant", content: "" });

		const baseReq = this.metrics.requestTokens || 0;
		const baseResp = this.metrics.responseTokens || 0;
		const baseSeconds = this.metrics.seconds || 0;
		const stepStart = Date.now();

		const connection = new Connection(
			this.config.aiUrl,
			this.config.aiKey,
			(conn) => {
				if (this.request) {
					const last = this.request.messages.length - 1;
					this.request.messages[last] = conn.response.message;
				}
				this.metrics.requestTokens = baseReq + (conn.response.metrics.requestTokens || 0);
				this.metrics.responseTokens = baseResp + (conn.response.metrics.responseTokens || 0);
				this.metrics.seconds = baseSeconds + (Date.now() - stepStart) / 1000;
				this.updated(this);
			},
			{ retries: this.config.aiRetries ?? 3, retryDelaySeconds: this.config.aiRetryDelaySeconds ?? 10 }
		);

		await connection.send(this.request);
		if (connection.response.status === "error")
			throw new Error("The last response was in error!");

		const text = (connection.response.message.content || "").trim();
		let m = /Total number of items in list:\s*(\d+)\b/i.exec(text);
		if (!m)
			m = /Total number of items in list\b[\s\S]*?(\d+)/i.exec(text);

		if (!m) {
			const snippet = text.length > 1000 ? text.slice(0, 1000) + "..." : text;
			throw new Error(`Could not detect 'Total number of items in list: #.' Response snippet:\n${snippet}`);
		}
		return Number.parseInt(m[1] || "0", 10);
	}

	private async step3Contents(counter: number): Promise<{ file?: File; handled?: boolean }> {
		if (!this.request)
			throw new Error("Request is invalid!");

		let prompt = await this.readBundledPrompt("update/003-contents.md");
		prompt = prompt.replace(/{{counter}}/g, counter.toFixed());

		this.request.messages.push({ role: "user", content: prompt });
		this.request.messages.push({ role: "assistant", content: "" });

		const baseReq = this.metrics.requestTokens || 0;
		const baseResp = this.metrics.responseTokens || 0;
		const baseSeconds = this.metrics.seconds || 0;
		const stepStart = Date.now();

		const connection = new Connection(
			this.config.aiUrl,
			this.config.aiKey,
			(conn) => {
				if (this.request) {
					const last = this.request.messages.length - 1;
					this.request.messages[last] = conn.response.message;
				}
				this.metrics.requestTokens = baseReq + (conn.response.metrics.requestTokens || 0);
				this.metrics.responseTokens = baseResp + (conn.response.metrics.responseTokens || 0);
				this.metrics.seconds = baseSeconds + (Date.now() - stepStart) / 1000;
				this.updated(this);
			},
			{ retries: this.config.aiRetries ?? 3, retryDelaySeconds: this.config.aiRetryDelaySeconds ?? 10 }
		);

		await connection.send(this.request);
		if (connection.response.status === "error")
			throw new Error("The last response was in error!");

		const text = connection.response.message.content || "";

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

		try {
			const blocks = parseFileFencedBlocks(text);
			if (!blocks || blocks.length === 0) {
				this.appendFileParseError(counter, "Could not locate file name and contents in the response. Please provide the full, corrected file contents in a single fenced block using the absolute repository-relative path without any URI scheme, like:\n\n`File `src/path/to/file.ext`:`");
				throw new Error("Could not locate file name and contents!");
			}

			const first = blocks[0];
			if (!first || !first.name || first.contents === undefined) {
				this.appendFileParseError(counter, "Could not locate file name and contents in the response. Please provide the full, corrected file contents in a single fenced block using the absolute repository-relative path without any URI scheme, like:\n\n`File `src/path/to/file.ext`:`");
				throw new Error("Could not locate file name and contents!");
			}

			return { file: { name: first.name, contents: first.contents }, handled: false };
		} catch {
			throw new Error("Missing file block.");
		}
	}

	private isCommand(file: File): boolean {
		const name = (file.name || "").toLowerCase();
		const body = (file.contents || "").trimStart();
		return name.endsWith(".sh") || name.endsWith(".bat") || name.endsWith(".cmd") || name.endsWith(".ps1") || body.startsWith("#!");
	}

	private async execCommand(file: File): Promise<{ ok: boolean; code: number; output: string }> {
		const abs = this.repository.makeAbsolute(file.name);
		const lower = (file.name || "").toLowerCase();
		const isWin = process.platform === "win32";

		let cmd: string;
		if (isWin) {
			cmd = lower.endsWith(".ps1")
				? `powershell -NoProfile -ExecutionPolicy Bypass -File "${abs}"`
				: `cmd.exe /c "${abs}"`;
		} else {
			cmd = `bash "${abs}"`;
		}

		const r = await NoninteractiveShell.execute(cmd, { cwd: this.repository.root });
		return { ok: !r.error && r.code === 0, code: typeof r.code === "number" ? r.code : -1, output: r.output || "" };
	}

	private appendExecError(step: number, name: string, code: number, output: string): void {
		if (!this.request)
			return;

		const text = [
			`The generated command file '${name}' for step ${step} failed to execute.`,
			`Exit code: ${code}`,
			"",
			"```",
			output || "(no output)",
			"```",
			"",
			"Please fix the script and provide a corrected file for the same step."
		].join("\n");

		this.request.messages.push({ role: "user", content: text });
		this.request.messages.push({ role: "assistant", content: "" });
	}

	private appendFileParseError(step: number, output: string): void {
		if (!this.request)
			return;

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
			"Ensure the fenced block uses a run of backticks longer than any backtick runs in the file contents."
		].join("\n");

		this.request.messages.push({ role: "user", content: text });
		this.request.messages.push({ role: "assistant", content: "" });
	}
}