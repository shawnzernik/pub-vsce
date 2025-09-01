import * as React from "react";
import { createRoot } from "react-dom/client";
import { Flex } from "../../components/Flex";
import { PostMessageClient } from "./PostMessageClient";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Nullable } from "@lvt/aici-library/dist/Nullable";
import { Conversation as ConversationView } from "./Conversation";
import { Conversation as ConversationDto } from "@lvt/aici-library/dist/llm/Conversation";
import { Message } from "@lvt/aici-library/dist/llm/Message";
import { NewMessage } from "./NewMessage";
import { Attachments } from "./Attachments";
import { FileHelper } from "@lvt/aici-library/dist/llm/FileHelper";
import { Metrics } from "@lvt/aici-library/dist/llm/Metrics";
import { Select } from "../../components/Select";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";
import { ResponseStatus } from "@lvt/aici-library/dist/llm/Response";
import QuestionCircle from "bootstrap-icons/icons/question-circle.svg";
import Gear from "bootstrap-icons/icons/gear.svg";
import "../../../static/chat.css";

export type ChatRendering = "markdown" | "pre";

interface State {
	file: Nullable<File>;
	message: Message;
	aiModel: string;
	aiModels: string[];
	format: ChatRendering;
	metrics: Metrics;
	status: ResponseStatus;
	attachments: File[];
	conversation?: ConversationDto;
}
interface Properties { }

export class ChatWebview extends React.Component<Properties, State> {
	public postMessageClient: PostMessageClient | undefined;

	public constructor(props: Properties) {
		super(props);
		this.state = {
			file: undefined,
			aiModel: "default",
			aiModels: [],
			format: "markdown",
			message: {
				role: "user",
				content: ""
			},
			metrics: { requestTokens: 0, responseTokens: 0, seconds: 0 },
			status: "idle",
			attachments: []
		};
	}

	public override componentDidMount(): void {
		this.postMessageClient = new PostMessageClient(this);
	}

	public override componentDidUpdate(_: Properties, prevState: State): void {
		if (this.state.file) {
			const prevContents = prevState.file?.contents;
			const currContents = this.state.file.contents;
			if (prevContents !== currContents) {
				const parsed = this.tryParseConversation(currContents);
				if (parsed) this.setState({ conversation: parsed });
			}
		}
	}

	private tryParseConversation(contents: string): ConversationDto | undefined {
		try {
			const c = JSON.parse(contents) as any;
			if (!Array.isArray(c?.messages)) c.messages = [];
			return c as ConversationDto;
		} catch {
			return undefined;
		}
	}

	private changeFile(contents: string): void {
		if (!this.state.file)
			return;

		const newFile: File = {
			name: this.state.file.name,
			contents: contents
		};

		const nextConversation = this.tryParseConversation(contents);

		this.setState((_) => ({
			file: newFile,
			...(nextConversation !== undefined ? { conversation: nextConversation } : {})
		}));
		this.postMessageClient?.sendFileChanged(newFile);
	}

	private onNewMessageSend(): void {
		if (!this.state.file || !this.state.conversation)
			return;

		const convo = JsonHelper.copy<ConversationDto>(this.state.conversation);
		const trimmed = (this.state.message.content || "").trim();
		if (!trimmed)
			return;

		const filesInline = this.state.attachments.map((file) => {
			return FileHelper.toMarkdown(file);
		}).join("\n\n");

		const content = `${filesInline}\n\n\n${trimmed}`.trim();
		const currentMsgs = Array.isArray(convo.messages) ? convo.messages : [];
		convo.messages = [...currentMsgs, { role: "user", content }];

		this.postMessageClient?.sendAiChat(convo, this.state.aiModel);

		this.setState({
			attachments: [],
			message: { role: "user", content: "" },
			status: "streaming"
		});
	}

	private onResendConversation(convo: ConversationDto): void {
		this.postMessageClient?.sendAiChat(convo, this.state.aiModel);
	}

	private onUserMessageSelected(index: number, content: string): void {
		if (!this.state.file || !this.state.conversation)
			return;

		const convo = this.state.conversation;
		const base = Array.isArray(convo.messages) ? convo.messages : [];
		const sliced: ConversationDto = {
			dated: convo.dated,
			title: convo.title,
			messages: base.slice(0, index)
		};

		const json = JSON.stringify(sliced, null, "\t");
		this.changeFile(json);
		this.setState({ message: { role: "user", content: content.trim() } });
	}

	private tokensPerSecond(): string {
		const total = (this.state.metrics.requestTokens || 0) + (this.state.metrics.responseTokens || 0);
		const s = this.state.metrics.seconds || 0;
		if (!s)
			return "0.00";
		const tps = total / s;
		return tps.toFixed(2);
	}

	private resetConversation(): void {
		const systemPrompt =
			this.state.conversation?.messages?.[0]?.role === "system"
				? this.state.conversation?.messages?.[0]?.content || ""
				: "";

		const newConvo: ConversationDto = {
			dated: new Date().toISOString(),
			title: "",
			messages: [{ role: "system", content: systemPrompt }]
		};

		if (!this.state.file) return;

		const newFile: File = {
			name: this.state.file.name,
			contents: JSON.stringify(newConvo, null, "\t")
		};

		this.setState({
			file: newFile,
			conversation: newConvo,
			message: { role: "user", content: "" },
			attachments: [],
			status: "idle",
			metrics: { requestTokens: 0, responseTokens: 0, seconds: 0 }
		});

		this.postMessageClient?.sendFileChanged(newFile);
	}

	public override render() {
		if (!this.state.file || !this.state.conversation)
			return <div><h1>No File Loaded</h1></div>;

		const conversation = this.state.conversation as ConversationDto;
		const modelOptions = this.state.aiModels || [];

		const statusLabel = this.state.status.charAt(0).toUpperCase() + this.state.status.slice(1);

		return (
			<Flex direction="column" style={{ height: "100vh", minHeight: "0", overflowX: "hidden" }}>
				<Flex
					direction="row"
					alignItems="center"
					gap="1em"
					flexWrap="wrap"
					style={{
						borderBottom: "1pt solid var(--vscode-editorWidget-border)",
						paddingBottom: "1em",
						marginBottom: "1em",
						paddingTop: "1em",
						justifyContent: "space-between"
					}}>
					<Flex direction="row" alignItems="center" gap="1em" flexWrap="wrap">
						<Flex direction="row" alignItems="center" style={{ gap: "0.25em" }}>
							<span>Model:</span>
							<Select
								value={this.state.aiModel}
								onChange={(val) => {
									this.setState({
										aiModel: val
									});
								}}
								options={[
									{ value: "default", label: "Default" },
									...modelOptions.map(m => ({ value: m, label: m }))
								]}
							/>
						</Flex>
						<Flex direction="row" alignItems="center" style={{ gap: "0.25em" }}>
							<span>Output:</span>
							<Select
								value={this.state.format}
								onChange={(val) => {
									this.setState({
										format: val as ChatRendering
									});
								}}
								options={[
									{ value: "markdown", label: "Markdown" },
									{ value: "pre", label: "Preformatted" }
								]}
							/>
						</Flex>
					</Flex>

					<Flex direction="row" alignItems="center" gap="0.5em" style={{ marginLeft: "auto" }}>
						<button
							type="button"
							title="Help"
							onClick={() => this.postMessageClient?.sendOpenHelp()}
							style={{
								background: "transparent",
								border: "none",
								padding: "0.25em",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--vscode-icon-foreground)"
							}}
						>
							<QuestionCircle width={18} height={18} />
						</button>
						<button
							type="button"
							title="Settings"
							onClick={() => this.postMessageClient?.sendOpenSettings()}
							style={{
								background: "transparent",
								border: "none",
								padding: "0.25em",
								cursor: "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--vscode-icon-foreground)"
							}}
						>
							<Gear width={18} height={18} />
						</button>
					</Flex>
				</Flex>

				<ConversationView
					format={this.state.format}
					model={conversation}
					onChange={(convo: ConversationDto) => {
						const json = JSON.stringify(convo, null, "\t");
						this.changeFile(json);
					}}
					onSend={this.onResendConversation.bind(this)}
					onUserMessageSelected={this.onUserMessageSelected.bind(this)}
					onSaveSnippet={(text: string, filename: string) => {
						this.postMessageClient?.sendSaveSnippet(text, filename);
					}}
				/>

				<Flex
					direction="row"
					alignItems="center"
					justifyContent="space-between"
					gap="1em"
					style={{
						borderTop: "1pt solid var(--vscode-editorWidget-border)",
						paddingTop: "1em",
						marginTop: "1em",
					}}
				>
					<span>Status:<br /> {statusLabel}</span>
					<span>Prompt:<br /> {this.state.metrics.requestTokens}</span>
					<span>Completion:<br /> {this.state.metrics.responseTokens}</span>
					<span>Seconds:<br /> {this.state.metrics.seconds.toFixed(1)}</span>
					<span>Tokens/Second:<br /> {this.tokensPerSecond()}</span>
				</Flex>

				<Attachments
					model={this.state.attachments}
					onChange={(attachments: File[]) => {
						this.setState({ attachments: attachments });
					}}
				/>

				<NewMessage
					model={this.state.message}
					onChange={(msg: Message) => {
						this.setState({ message: msg });
					}}
					onSend={this.onNewMessageSend.bind(this)}
					onReset={this.resetConversation.bind(this)}
				/>
			</Flex>
		);
	}
}

window.addEventListener("load", () => {
	const rootElement = document.getElementById("root");
	if (rootElement) {
		const root = createRoot(rootElement);
		root.render(<ChatWebview />);
	}
});