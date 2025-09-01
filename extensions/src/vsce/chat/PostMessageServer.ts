import * as vscode from "vscode";
import * as path from "path";
import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";
import { BasePostMessageServer } from "../BasePostMessageServer";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Conversation } from "@lvt/aici-library/dist/llm/Conversation";
import { Connection } from "../../llm/Connection";
import { Connection as OpenAiConnection } from "../../llm/openai/Connection";
import { Config } from "../../config";
import { Uuid } from "@lvt/aici-library/dist/Uuid";
import { Request } from "@lvt/aici-library/dist/llm/Request";
import { Metrics } from "@lvt/aici-library/dist/llm/Metrics";
import { ChatRequest } from "@lvt/aici-library/dist/vsce/chat/ChatRequest";
import { Repository } from "../../system/Repository";
import { WorkflowFactory } from "../../llm/workflows/WorkflowFactory";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";
import { ResponseStatus } from "@lvt/aici-library/dist/llm/Response";
import { WorkflowBase } from "../../llm/workflows/WorkflowBase";

export class PostMessageServer extends BasePostMessageServer {
	private static readonly servers = new Set<PostMessageServer>();

	private getSnapshot: (() => File) | undefined;
	private onFileChanged: ((file: File) => void) | undefined;
	private resourceUri: vscode.Uri | undefined;

	public constructor(panel: vscode.WebviewPanel, resourceUri?: vscode.Uri, getSnapshot?: () => File, onFileChanged?: (file: File) => void) {
		super(panel);
		this.resourceUri = resourceUri;
		this.getSnapshot = getSnapshot;
		this.onFileChanged = onFileChanged;

		PostMessageServer.servers.add(this);
		panel.onDidDispose?.(() => {
			PostMessageServer.servers.delete(this);
		});
	}

	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};

		ret[PostMessageTypes.AiChat] = this.handleAiChat.bind(this);
		if (this.getSnapshot)
			ret[PostMessageTypes.WebviewReady] = this.handleWebviewReady.bind(this);
		if (this.onFileChanged)
			ret[PostMessageTypes.FileChanged] = this.handleFileChanged.bind(this);

		ret[PostMessageTypes.SnippetSave] = this.handleSaveSnippet.bind(this);
		ret[PostMessageTypes.OpenHelp] = this.handleOpenHelp.bind(this);
		ret[PostMessageTypes.OpenSettings] = this.handleOpenSettings.bind(this);

		return ret;
	}

	private async handleSaveSnippet(message: PostMessage<{ text: string; filename?: string }>): Promise<void> {
		const content = message.payload?.text ?? "";
		const suggested = message.payload?.filename || "snippet.txt";

		let defaultUri: vscode.Uri | undefined;
		try {
			if (this.resourceUri?.fsPath) {
				const dir = path.dirname(this.resourceUri.fsPath);
				defaultUri = vscode.Uri.file(path.join(dir, suggested));
			}
		} catch { }

		const saveDialogOptions: vscode.SaveDialogOptions = {
			saveLabel: "Save snippet as…",
			filters: { "All Files": ["*"] }
		};
		if (defaultUri) {
			saveDialogOptions.defaultUri = defaultUri;
		}

		const uri = await vscode.window.showSaveDialog(saveDialogOptions);
		if (!uri)
			return;

		const bytes = new TextEncoder().encode(content);
		await vscode.workspace.fs.writeFile(uri, bytes);
	}

	private getLastUserMessage(conversation: Conversation): { role: string; content: string } | undefined {
		const msgs = conversation?.messages || [];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const m = msgs[i];
			if ((m?.role || "").toLowerCase() === "user")
				return m;
		}
		return undefined;
	}

	private extractWorkflowName(text: string): string | undefined {
		const lines = (text || "").split(/\r?\n/);
		for (const raw of lines) {
			const line = raw.trim();
			const m = /^\s*\/([a-z][\w\-]*)\s*$/i.exec(line);
			if (m) return (m[1] || "").toLowerCase();
		}
		return undefined;
	}

	private cloneAndAppendAssistant(convo: Conversation, content: string): Conversation {
		const cloned = JsonHelper.copy<Conversation>(convo);
		cloned.messages.push({ role: "assistant", content });
		return cloned;
	}

	private resolveModel(selection: string | undefined, defaultModel: string): string {
		if (!selection || selection === "default") return defaultModel || "";
		return selection;
	}

	private async handleAiChat(message: PostMessage<ChatRequest>): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		try {
			const config = await Config.create(this.resourceUri!);
			const lastUserMessage = this.getLastUserMessage(message.payload.conversation);
			const workflowName = this.extractWorkflowName(lastUserMessage?.content || "");

			if (workflowName)
				await this.handleAiChatWorkflow(message, config, workflowName);
			else
				await this.handleAiChatOpenAi(message, config);
		} catch (err) {
			const errMsg = [
				(err as Error)?.message || "Unknown error",
				"",
				"```",
				(err as Error)?.stack || "No stack trace",
				"```"
			].join("\n");
			console.log(errMsg);
		}
	}
	private async handleAiChatOpenAi(message: PostMessage<ChatRequest>, config: Config): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		const modelToUse = this.resolveModel(message.payload.model, config.aiModel || "");

		const updater = (me: Connection) => {
			const cloned = this.cloneAndAppendAssistant(message.payload.conversation, me.response.message.content);
			this.sendAiChat(cloned, me.response.metrics, "streaming");
		};
		const conn = new OpenAiConnection(
			config.aiUrl,
			config.aiKey,
			updater,
			{
				retries: config.aiRetries ?? 3,
				retryDelaySeconds: config.aiRetryDelaySeconds ?? 10
			}
		);

		const request: Request = {
			id: Uuid.asString(),
			model: modelToUse,
			messages: message.payload.conversation.messages
		};
		await conn.send(request);
		const cloned = this.cloneAndAppendAssistant(message.payload.conversation, conn.response.message.content);
		this.sendAiChat(cloned, conn.response.metrics, "idle");
	}

	private async handleAiChatWorkflow(message: PostMessage<ChatRequest>, config: Config, workflowName: string): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		const modelToUse = this.resolveModel(message.payload.model, config.aiModel || "");

		const updater = (me: WorkflowBase) => {
			const cloned = JsonHelper.copy<Conversation>(message.payload.conversation);
			cloned.messages = me.request!.messages;
			this.sendAiChat(cloned, me.metrics, "streaming");
		};

		const repo = await Repository.instance(this.resourceUri!);
		const workflow = WorkflowFactory.create(config, repo, workflowName, updater);

		const request: Request = {
			id: Uuid.asString(),
			model: modelToUse,
			messages: message.payload.conversation.messages
		};

		await workflow.send(request);
		const cloned = JsonHelper.copy<Conversation>(message.payload.conversation);
		cloned.messages = workflow.request!.messages;
		this.sendAiChat(cloned, workflow.metrics, "idle");
	}

	private async handleWebviewReady(): Promise<void> {
		if (this.getSnapshot)
			this.send(PostMessageTypes.FileLoaded, this.getSnapshot());

		const config = await Config.create(this.resourceUri!);
		this.sendAiModels(config.aiModels || [], config.aiModel || "");
	}

	private handleFileChanged(message: PostMessage<File>): void {
		if (!this.onFileChanged)
			return;

		this.onFileChanged(message.payload);
	}

	private handleOpenHelp(): void {
		void vscode.commands.executeCommand("aici.openHelp");
	}

	private handleOpenSettings(): void {
		void vscode.commands.executeCommand("aici.openSettings");
	}

	public sendFileLoaded(payload: File): void {
		this.send(PostMessageTypes.FileLoaded, payload);
	}

	public sendAiChat(conversation: Conversation, metrics?: Metrics, _status?: ResponseStatus): void {
		const chatRequest = {
			model: "",
			conversation,
			metrics: metrics || { requestTokens: 0, responseTokens: 0, seconds: 0 }
		};
		this.send(PostMessageTypes.AiChat, chatRequest);
	}

	public sendRepositoryFiles(files: File[]): void {
		this.send(PostMessageTypes.RepositoryFiles, files);
	}

	public sendAiModels(models: string[], defaultModel?: string): void {
		this.send(PostMessageTypes.AiModels, { models, defaultModel });
	}

	public static broadcastRepositoryFiles(files: File[]): number {
		let count = 0;
		for (const srv of PostMessageServer.servers) {
			srv.sendRepositoryFiles(files);
			count++;
		}
		return count;
	}
}