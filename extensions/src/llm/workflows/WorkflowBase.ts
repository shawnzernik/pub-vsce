import { Request } from "@lvt/aici-library/dist/llm/Request";
import { Repository } from "../../system/Repository";
import { Metrics } from "@lvt/aici-library/dist/llm/Metrics";
import { Config } from "../../config";
import { Message } from "@lvt/aici-library/dist/llm/Message";
import { ResponseStatus } from "@lvt/aici-library/dist/llm/Response";
import { Uuid } from "@lvt/aici-library/dist/Uuid";

import { Connection } from "../openai/Connection";

export type WorkflowUpdater = (me: WorkflowBase) => void;

export abstract class WorkflowBase {
	public updated: WorkflowUpdater;
	protected repository: Repository;
	protected config: Config;
	public metrics: Metrics;
	public status: ResponseStatus;
	public request: Request | undefined;

	public constructor(config: Config, repository: Repository, updater: WorkflowUpdater) {
		this.status = "idle";
		this.repository = repository;
		this.updated = updater;
		this.config = config;
		this.metrics = {
			requestTokens: 0,
			responseTokens: 0,
			seconds: 0,
		};
	}

	private started = Date.now();

	protected appendAssistantMessage(content: string): void {
		if (this.request) {
			this.request.messages.push({
				role: "assistant",
				content
			});
		}
	}

	public async sendRequest(request: Request): Promise<void> {
		// Pass request by reference to enable natural updates
		this.request = request;
		this.status = "working";
		this.metrics = {
			requestTokens: 0,
			responseTokens: 0,
			seconds: 0
		};

		const tempMessages: Message[] = [];
		for (let cnt = 0; cnt < this.request.messages.length - 1; cnt++)
			tempMessages.push(this.request.messages[cnt]!);
		this.request.messages = tempMessages;
		this.updated(this);

		try {
			await this.execute()
		} catch (err) {
			const error = err as Error;
			const errorText = `Workflow error:\n\n${error.message}\n\n${error.stack || ""}\n\nPlease fix the issue and retry.`;
			this.appendAssistantMessage(errorText);
		}
	}

	protected abstract execute(): Promise<void>;

	protected updateMetrics(m: Partial<Metrics>): void {
		this.metrics.requestTokens = Number(m.requestTokens ?? 0);
		this.metrics.responseTokens = Number(m.responseTokens ?? 0);
		this.metrics.seconds = Number(m.seconds ?? 0);
		this.updated(this);
	}

	protected createUpdater(): (conn: any) => void {
		return () => { };
	}

	protected async sendUserMessage(prompt: string): Promise<string> {
		if (!this.request) throw new Error("Request not initialized");

		this.request.messages.push({ role: "user", content: prompt });
		this.request.messages.push({ role: "assistant", content: "" });

		this.started = Date.now();

		const conn = new Connection(
			this.config.aiUrl,
			this.config.aiKey,
			(conn: any) => {
				const lastIndex = this.request!.messages.length - 1;
				if (lastIndex >= 0) {
					this.request!.messages[lastIndex] = conn.response.message;
					this.updateMetrics(conn.response.metrics);
				}
			},
			{
				retries: this.config.aiRetries ?? 3,
				retryDelaySeconds: this.config.aiRetryDelaySeconds ?? 10,
			}
		);

		await conn.send(this.request);

		if (conn.response.status === "error") throw new Error("The last response was in error!");

		const last = this.request.messages[this.request.messages.length - 1];
		if (last && last.role === "assistant" && last.content === "") this.request.messages.pop();

		const lastAssistantIdx = this.request.messages.length - 1;
		const lastUserIdx = lastAssistantIdx - 1;
		if (
			this.request.messages &&
			lastUserIdx >= 0 &&
			this.request.messages[lastUserIdx] &&
			(this.request.messages[lastUserIdx]?.role || "").toLowerCase() === "user"
		) {
			const totalPrompt = Number(conn.response.metrics.requestTokens || 0);
			let priorPromptSum = 0;
			for (let i = 0; i < lastUserIdx; i++) {
				const msg = this.request.messages[i]!;
				if ((msg.role || "").toLowerCase() !== "assistant")
					priorPromptSum += Number(msg.tokenCount || 0);
			}
			const delta = Math.max(0, totalPrompt - priorPromptSum);
			this.request.messages[lastUserIdx].tokenCount = delta;
		}

		this.updateMetrics({ ...conn.response.metrics, seconds: conn.response.metrics.seconds || (Date.now() - this.started) / 1000 });

		return last?.content ?? "";
	}

	/**
	 * Send an isolated AI request out-of-band without affecting main workflow request.
	 * Supports supplying a new user message and optional prior message history.
	 */
	protected async sendOutOfBandRequest(newUserMessage: string, requestHistory?: Message[]): Promise<string> {
		const messages: Message[] = [];
		if (requestHistory && Array.isArray(requestHistory)) {
			messages.push(...requestHistory);
		} else {
			// If no history provided, load default system prompt from bundled prompts
			const systemPrompt = await this.readBundledPrompt("000-system.md");
			messages.push({ role: "system", content: systemPrompt });
		}

		messages.push({ role: "user", content: newUserMessage });

		const request: Request = {
			id: Uuid.asString(),
			model: this.config.aiModel,
			messages: messages
		};

		const conn = new Connection(
			this.config.aiUrl,
			this.config.aiKey,
			() => { },
			{
				retries: this.config.aiRetries ?? 3,
				retryDelaySeconds: this.config.aiRetryDelaySeconds ?? 10,
			}
		);

		await conn.send(request);

		if (conn.response.status === "error") throw new Error("The last response was in error!");

		return conn.response.message.content;
	}
	protected async readBundledPrompt(relPath: string): Promise<string> {
		const ext = await import("vscode").then((v) => v.extensions.getExtension("LagoVistaTechnologies.aici"));
		if (ext && ext.extensionPath) {
			const candidates = [
				`${ext.extensionPath}/dist/llm/workflows/prompts/${relPath}`,
				`${ext.extensionPath}/src/llm/workflows/prompts/${relPath}`,
				`${ext.extensionPath}/llm/workflows/prompts/${relPath}`,
			];
			for (const cand of candidates) {
				const fs = await import("fs");
				if (fs.existsSync(cand)) {
					return fs.readFileSync(cand, "utf8");
				}
			}
		}

		const repoPath = `extensions/src/llm/workflows/prompts/${relPath}`;
		return this.repository.read(repoPath);
	}
}
