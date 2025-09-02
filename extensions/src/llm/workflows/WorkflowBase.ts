import { Request } from "@lvt/aici-library/dist/llm/Request";
import { Repository } from "../../system/Repository";
import { Metrics } from "@lvt/aici-library/dist/llm/Metrics";
import { Config } from "../../config";
import { Message } from "@lvt/aici-library/dist/llm/Message";
import { ResponseStatus } from "@lvt/aici-library/dist/llm/Response";
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

	public async sendRequest(request: Request): Promise<Request> {
		this.request = JSON.parse(JSON.stringify(request)) as Request; // deep copy as workaround
		this.started = Date.now();
		this.status = "streaming";

		const tempMessages: Message[] = [];
		for (let cnt = 0; cnt < this.request.messages.length - 1; cnt++)
			tempMessages.push(this.request.messages[cnt]!);
		this.request.messages = tempMessages;
		this.updated(this);

		const result = await this.execute(this.request);
		return result;
	}

	protected abstract execute(request: Request): Promise<Request>;

	protected updateMetrics(_metrics: Partial<Metrics>): void {
		// Only update elapsed seconds here; tokens tracked per message
		this.metrics.seconds = (Date.now() - this.started) / 1000;
		this.updated(this);
	}

	protected createUpdater(): (conn: any) => void {
		return () => { };
	}

	protected async sendUserMessage(prompt: string): Promise<string> {
		if (!this.request) throw new Error("Request not initialized");

		this.request.messages.push({ role: "user", content: prompt });
		this.request.messages.push({ role: "assistant", content: "" });

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

		return last?.content ?? "";
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