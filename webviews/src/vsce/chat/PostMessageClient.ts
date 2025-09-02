import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";
import { BasePostMessageClient } from "../BasePostMessageClient";
import { ChatWebview } from "./ChatWebview";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Dictionary } from "@lvt/aici-library/dist/Dictionary";

import { Conversation as ConversationDto } from "@lvt/aici-library/dist/llm/Conversation";
import { ChatRequest } from "@lvt/aici-library/dist/vsce/chat/ChatRequest";

export class PostMessageClient extends BasePostMessageClient {
	private webview: ChatWebview;

	public constructor(webview: ChatWebview) {
		super();
		this.webview = webview;
		this.send(PostMessageTypes.WebviewReady, null);
	}

	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};

		ret[PostMessageTypes.FileLoaded] = this.onFileLoaded.bind(this);
		ret[PostMessageTypes.AiChat] = this.onAiChat.bind(this);
		ret[PostMessageTypes.RepositoryFiles] = this.onRepositoryFiles.bind(this);
		ret[PostMessageTypes.AiModels] = this.onAiModels.bind(this);
		ret[PostMessageTypes.SettingsLoaded] = this.onSettingsLoaded.bind(this);

		return ret;
	}

	private onFileLoaded(postMessage: PostMessage<File>) {
		this.webview.setState({ file: postMessage.payload });
	}

	private onAiChat(postMessage: PostMessage<ChatRequest>) {
		if (!this.webview.state.file)
			return;
		const payload = postMessage.payload;
		if (!payload)
			return;

		const incoming = payload.conversation;
		if (!incoming || !Array.isArray(incoming.messages))
			return;

		let currentConvo: ConversationDto | undefined = undefined;
		try {
			currentConvo = JSON.parse(this.webview.state.file.contents) as ConversationDto;
			if (!Array.isArray(currentConvo?.messages)) currentConvo.messages = [];
		} catch {
			currentConvo = undefined;
		}

		let newConvo: ConversationDto;

		if (!currentConvo || (incoming.messages.length > (currentConvo.messages?.length ?? 0))) {
			newConvo = incoming;
		} else {
			const incomingLast = incoming.messages.length > 0 ? incoming.messages[incoming.messages.length - 1] : undefined;
			const isAssistant = incomingLast && incomingLast.role && incomingLast.role.toLowerCase() === "assistant";
			const incomingText = (incomingLast?.content || "").trim();

			if (isAssistant && incomingText.length > 0) {
				const currMsgs = currentConvo.messages || [];
				const lastCurr = currMsgs.length ? currMsgs[currMsgs.length - 1] : undefined;
				const lastCurrText = (lastCurr?.content || "").trim();
				const lastCurrRole = (lastCurr?.role || "").toLowerCase();

				if (lastCurr && lastCurrRole === "assistant") {
					if (incomingText !== lastCurrText) {
						const replaced = currMsgs.slice(0, currMsgs.length - 1).concat([{ role: "assistant", content: incomingText, tokenCount: incomingLast.tokenCount ?? 0 }]);
						newConvo = {
							dated: currentConvo.dated || new Date().toISOString(),
							title: currentConvo.title || "",
							messages: replaced
						};
					} else {
						newConvo = currentConvo;
					}
				} else {
					if (incomingText !== lastCurrText) {
						const appended = currMsgs.concat([{ role: "assistant", content: incomingText, tokenCount: incomingLast.tokenCount ?? 0 }]);
						newConvo = {
							dated: currentConvo.dated || new Date().toISOString(),
							title: currentConvo.title || "",
							messages: appended
						};
					} else {
						newConvo = currentConvo;
					}
				}
			} else {
				newConvo = currentConvo;
			}
		}

		const newFile = this.createUpdatedFile(this.webview.state.file, newConvo);

		const prevMetrics = this.webview.state.metrics || { requestTokens: 0, responseTokens: 0, seconds: 0 };
		const nextMetrics = {
			requestTokens: payload.metrics?.requestTokens ?? prevMetrics.requestTokens,
			responseTokens: payload.metrics?.responseTokens ?? prevMetrics.responseTokens,
			seconds: payload.metrics?.seconds ?? prevMetrics.seconds
		};

		const nextStatus = payload.status ?? "idle";

		const oldContents = this.webview.state.file.contents;
		if (oldContents === newFile.contents) {
			this.webview.setState((_prevState, _props) => ({
				metrics: nextMetrics,
				status: nextStatus
			}));
			return;
		}

		this.webview.setState((_prevState, _props) => ({
			file: newFile,
			metrics: nextMetrics,
			status: nextStatus
		}));
	}

	private onRepositoryFiles(postMessage: PostMessage<File[]>) {
		this.webview.setState((prev) => {
			const mapFiles: Dictionary<string> = {};
			for (const file of prev.attachments)
				mapFiles[file.name] = file.contents;
			for (const file of postMessage.payload)
				mapFiles[file.name] = file.contents;

			const ret: File[] = [];
			Object.keys(mapFiles).forEach((key) => {
				ret.push({ name: key, contents: mapFiles[key]! });
			});

			return { attachments: ret };
		});
	}

	private onAiModels(postMessage: PostMessage<{ models: string[]; defaultModel?: string }>) {
		const models = postMessage.payload?.models || [];
		const def = postMessage.payload?.defaultModel || "";
		const chosen = models.includes(def) ? def : "default";
		this.webview.setState({
			aiModels: models,
			aiModel: chosen
		});
	}

	private onSettingsLoaded(postMessage: PostMessage<any>) {
		const cfg = postMessage.payload || {};
		this.webview.setState((_prevState) => ({
			..._prevState,
			config: cfg,
			aiModelsText: (cfg.aiModels || []).join("\n"),
			ignoreRegexText: (cfg.ignoreRegex || []).join("\n"),
		}));
	}


	private createUpdatedFile(currentFile: File, conversation: ConversationDto): File {
		return {
			name: currentFile.name,
			contents: JSON.stringify(conversation, null, "\t")
		};
	}

	public sendFileChanged(file: File): void {
		this.send(PostMessageTypes.FileChanged, file);
	}

	public sendAiChat(convo: ConversationDto, model?: string): void {
		const req: ChatRequest = {
			model: model ?? "",
			conversation: convo,
			metrics: {
				requestTokens: 0,
				responseTokens: 0,
				seconds: 0
			}
		};
		this.send(PostMessageTypes.AiChat, req);
	}

	public sendSaveSnippet(text: string, filename: string): void {
		this.send(PostMessageTypes.SnippetSave, { text, filename });
	}

	public sendOpenHelp(): void {
		this.send(PostMessageTypes.OpenHelp, null);
	}

	public sendOpenSettings(): void {
		this.send(PostMessageTypes.OpenSettings, null);
	}
}