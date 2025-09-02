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
import { ConversationManager } from "../../services/ConversationManager";

export class PostMessageServer extends BasePostMessageServer {
	public static readonly servers = new Set<PostMessageServer>();

	private getSnapshot: (() => File) | undefined;
	private fileChangedCallback: ((file: File) => void) | undefined;
	private resourceUri: vscode.Uri | undefined;

	public constructor(panel: vscode.WebviewPanel, resourceUri?: vscode.Uri, getSnapshot?: () => File, fileChangedCallback?: (file: File) => void) {
		super(panel);
		this.resourceUri = resourceUri;
		this.getSnapshot = getSnapshot;
		this.fileChangedCallback = fileChangedCallback;

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
		if (this.fileChangedCallback)
			ret[PostMessageTypes.FileChanged] = this.handleFileChanged.bind(this);

		ret[PostMessageTypes.SnippetSave] = this.handleSaveSnippet.bind(this);
		ret[PostMessageTypes.OpenHelp] = this.handleOpenHelp.bind(this);
		ret[PostMessageTypes.OpenSettings] = this.handleOpenSettings.bind(this);

		return ret;
	}

	private estimatePromptTokens(conversation: Conversation, divisor: number): number {
		if (!conversation?.messages) return 0;
		let length = 0;
		for (const message of conversation.messages) {
			if ((message.role || "").toLowerCase() !== "assistant") {
				length += (message.content || "").length;
			}
		}
		if (divisor <= 0) divisor = 3.5;
		return Math.ceil(length / divisor);
	}

	private async handleAiChat(message: PostMessage<ChatRequest>): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		try {
			const config = await Config.create(this.resourceUri!);
			const lastUserMessage = ConversationManager.getLastUserMessage(message.payload.conversation);
			const workflowName = ConversationManager.extractWorkflowName(lastUserMessage?.content || "");

			if (workflowName) {
				await this.handleAiChatWorkflow(message, config, workflowName);
			} else {
				await this.handleAiChatOpenAi(message, config);
			}
		} catch (err) {
			const errMsg = (err as Error)?.message || "Unknown error";
			const errConvo = ConversationManager.mergeAssistantMessage(
				message.payload.conversation,
				{ messages: [{ role: "assistant", content: `Error: ${errMsg}`, tokenCount: 0 }] } as Conversation
			);
			const newFileError = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				errConvo
			);
			this.sendAiChat(errConvo, { requestTokens: 0, responseTokens: 0, seconds: 0 }, "error");
			this.sendFileChanged(newFileError);
		}
	}

	private async handleAiChatOpenAi(message: PostMessage<ChatRequest>, config: Config): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		const divisor = config.tokenLengthDivisor ?? 3.5;
		const modelToUse = ConversationManager.resolveModel(message.payload.model, config.aiModel || "");

		const updater = (me: Connection) => {
			let promptTokens = me.response.metrics.requestTokens;
			if (promptTokens === 0) {
				promptTokens = this.estimatePromptTokens(message.payload.conversation, divisor);
			}

			const merged = ConversationManager.mergeAssistantMessage(message.payload.conversation, { messages: [{ role: "assistant", content: me.response.message.content, tokenCount: me.response.message.tokenCount }] } as Conversation);
			const newFile = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				merged
			);

			this.sendAiChat(merged, { ...me.response.metrics, requestTokens: promptTokens }, "streaming");
			this.sendFileChanged(newFile);
		};

		const conn = new OpenAiConnection(
			config.aiUrl,
			config.aiKey,
			updater,
			{
				retries: config.aiRetries ?? 3,
				retryDelaySeconds: config.aiRetryDelaySeconds ?? 10,
			}
		);

		const request: Request = {
			id: Uuid.asString(),
			model: modelToUse,
			messages: message.payload.conversation.messages
		};

		try {
			await conn.send(request);

			const mergedFinal = ConversationManager.mergeAssistantMessage(
				message.payload.conversation,
				{ messages: [{ role: "assistant", content: conn.response.message.content, tokenCount: conn.response.message.tokenCount }] } as Conversation
			);

			// Use actual tokens at completion
			const finalMetrics = { ...conn.response.metrics };
			const newFileFinal = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				mergedFinal
			);
			this.sendAiChat(mergedFinal, finalMetrics, "idle");
			this.sendFileChanged(newFileFinal);
		} catch (error) {
			const errMsg = (error as Error)?.message || "Unknown error";
			const errConvo = ConversationManager.mergeAssistantMessage(
				message.payload.conversation,
				{ messages: [{ role: "assistant", content: `Error: ${errMsg}`, tokenCount: 0 }] } as Conversation
			);
			const newFileError = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				errConvo
			);
			this.sendAiChat(errConvo, { requestTokens: 0, responseTokens: 0, seconds: 0 }, "error");
			this.sendFileChanged(newFileError);
		}
	}

	private async handleAiChatWorkflow(message: PostMessage<ChatRequest>, config: Config, workflowName: string): Promise<void> {
		if (!message.payload || !message.payload.conversation)
			return;

		const divisor = config.tokenLengthDivisor ?? 3.5;
		const modelToUse = ConversationManager.resolveModel(message.payload.model, config.aiModel || "");

		const updater = (me: WorkflowBase) => {
			let promptTokens = me.metrics.requestTokens;
			if (promptTokens === 0 && me.request && me.request.messages) {
				promptTokens = this.estimatePromptTokens({ dated: "", title: "", messages: me.request.messages }, divisor);
			}

			const convoCopy = JsonHelper.copy<Conversation>(message.payload.conversation);
			convoCopy.messages = me.request!.messages;
			const newFile = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				convoCopy
			);
			this.sendAiChat(convoCopy, { ...me.metrics, requestTokens: promptTokens }, "streaming");
			this.sendFileChanged(newFile);
		};

		const repo = await Repository.instance(this.resourceUri!);
		const workflow = WorkflowFactory.create(config, repo, workflowName, updater);

		const request: Request = {
			id: Uuid.asString(),
			model: modelToUse,
			messages: message.payload.conversation.messages
		};

		try {
			await workflow.sendRequest(request);

			const convoCopyFinal = JsonHelper.copy<Conversation>(message.payload.conversation);
			convoCopyFinal.messages = workflow.request!.messages;

			// Use actual metrics at completion
			const finalMetrics = { ...workflow.metrics };

			const newFileFinal = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				convoCopyFinal
			);
			this.sendAiChat(convoCopyFinal, finalMetrics, "idle");
			this.sendFileChanged(newFileFinal);
		} catch (error) {
			const errMsg = (error as Error)?.message || "Unknown error";
			const errConvo = ConversationManager.mergeAssistantMessage(
				message.payload.conversation,
				{ messages: [{ role: "assistant", content: `Error: ${errMsg}`, tokenCount: 0 }] } as Conversation
			);
			const newFileError = this.createUpdatedFile(
				this.getSnapshot ? this.getSnapshot() : { name: "", contents: "" },
				errConvo
			);
			this.sendAiChat(errConvo, { requestTokens: 0, responseTokens: 0, seconds: 0 }, "error");
			this.sendFileChanged(newFileError);
		}
	}

	public async handleSaveSnippet(message: PostMessage<{ text: string; filename?: string }>): Promise<void> {
		const content = message.payload?.text ?? "";
		const suggested = message.payload?.filename || "snippet.txt";

		let defaultUri: vscode.Uri | undefined;
		try {
			if (this.resourceUri?.fsPath) {
				const dir = vscode.Uri.file(this.resourceUri.fsPath).fsPath ? this.resourceUri.fsPath : undefined;
				if (dir) {
					defaultUri = vscode.Uri.file(path.join(dir, suggested));
				}
			}
		} catch { }

		const saveDialogOptions: vscode.SaveDialogOptions = {
			saveLabel: "Save snippet as…",
			filters: { "All Files": ["*"] },
		};
		if (defaultUri) {
			saveDialogOptions.defaultUri = defaultUri;
		}

		const uri = await vscode.window.showSaveDialog(saveDialogOptions);
		if (!uri) return;

		const bytes = new TextEncoder().encode(content);
		await vscode.workspace.fs.writeFile(uri, bytes);
	}

	public handleWebviewReady(): void {
		if (this.getSnapshot) this.send(PostMessageTypes.FileLoaded, this.getSnapshot());

		void Config.create(this.resourceUri!).then(config => {
			this.sendAiModels(config.aiModels || [], config.aiModel || "");
		});
	}

	public handleFileChanged(message: PostMessage<File>): void {
		if (!this.fileChangedCallback) return;

		this.fileChangedCallback(message.payload);
	}

	public handleOpenHelp(): void {
		void vscode.commands.executeCommand("aici.openHelp");
	}

	public handleOpenSettings(): void {
		void vscode.commands.executeCommand("aici.openSettings");
	}

	public createUpdatedFile(currentFile: File, conversation: Conversation): File {
		return {
			name: currentFile.name,
			contents: JSON.stringify(conversation, null, "\t")
		};
	}

	public sendFileChanged(file: File): void {
		if (this.fileChangedCallback) {
			this.fileChangedCallback(file);
		}
	}

	public sendFileLoaded(payload: File): void {
		this.send(PostMessageTypes.FileLoaded, payload);
	}

	public sendAiChat(conversation: Conversation, metrics?: Metrics, status?: ResponseStatus): void {
		const chatRequest = {
			model: "",
			conversation,
			metrics: metrics || { requestTokens: 0, responseTokens: 0, seconds: 0 },
			status: status || "idle"
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