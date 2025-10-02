import * as React from "react";
import { createRoot } from "react-dom/client";
import { Flex } from "../../components/Flex";
import { PostMessageClient } from "./PostMessageClient";
import { AiciConfig } from "@lvt/aici-library/dist/vsce/AiciConfig";
import { Select } from "../../components/Select";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";
import { Button } from "../../components/Button";
import "../../../static/settings.css";

interface State {
	config: AiciConfig;
	aiModelsText: string;
	ignoreRegexText: string;
}

interface Properties { }

export class SettingsWebview extends React.Component<Properties, State> {
	public pmClient: PostMessageClient | undefined;
	private aiModelsRef: React.RefObject<HTMLTextAreaElement | null>;
	private ignoreRegexRef: React.RefObject<HTMLTextAreaElement | null>;

	public constructor(props: Properties) {
		super(props);
		this.state = {
			config: {
				aiApi: "",
				aiKey: "",
				aiUrl: "",
				aiModel: "",
				aiModels: [],
				ignoreRegex: [],
				aiRetries: 3,
				aiRetryDelaySeconds: 10,
				updateRetries: 3,
				buildBuildRetries: 5
			},
			aiModelsText: "",
			ignoreRegexText: ""
		};

		this.aiModelsRef = React.createRef<HTMLTextAreaElement>();
		this.ignoreRegexRef = React.createRef<HTMLTextAreaElement>();
	}

	public override componentDidMount(): void {
		this.pmClient = new PostMessageClient(this);
		// Ask the extension for current settings
		this.pmClient.requestSettings();

		// autosize textareas on mount
		this.autoSizeTextarea(this.aiModelsRef);
		this.autoSizeTextarea(this.ignoreRegexRef);
	}

	private autoSizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>): void {
		const el = ref?.current;
		if (!el)
			return;
		requestAnimationFrame(() => {
			el.style.height = "auto";
			const h = el.scrollHeight + 2;
			el.style.height = `${h}px`;
		});
	}

	public override componentDidUpdate(_prevProps: Properties, prevState: State): void {
		if (prevState.aiModelsText !== this.state.aiModelsText) {
			this.autoSizeTextarea(this.aiModelsRef);
		}
		if (prevState.ignoreRegexText !== this.state.ignoreRegexText) {
			this.autoSizeTextarea(this.ignoreRegexRef);
		}
	}

	private parseLinesToArray(text: string): string[] {
		return (text || "")
			.split(/\r?\n/g)
			.map(s => s.trim())
			.filter(s => s.length > 0);
	}

	private onSave(): void {
		const config = JsonHelper.copy<AiciConfig>(this.state.config);
		config.aiModels = this.parseLinesToArray(this.state.aiModelsText);
		config.ignoreRegex = this.parseLinesToArray(this.state.ignoreRegexText);

		// coerce numeric fields to numbers and provide sane defaults
		config.aiRetries = Number(config.aiRetries ?? 3);
		config.aiRetryDelaySeconds = Number(config.aiRetryDelaySeconds ?? 10);
		config.updateRetries = Number(config.updateRetries ?? 3);
		config.buildBuildRetries = Number(config.buildBuildRetries ?? 5);

		this.pmClient?.saveSettings(config);
	}

	public override render(): React.ReactNode {
		const { config } = this.state;

		const inputStyle: React.CSSProperties = {
			width: "100%",
			boxSizing: "border-box",
			padding: "0.4em 0.6em",
			borderRadius: 4,
			border: "1px solid var(--vscode-editorWidget-border)",
			background: "var(--vscode-input-background, var(--vscode-editorWidget-background))",
			color: "var(--vscode-input-foreground, var(--vscode-editor-foreground))",
			fontFamily: "var(--vscode-font-family, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)",
			fontSize: "0.95em"
		};

		const textareaStyle: React.CSSProperties = {
			...inputStyle,
			resize: "vertical",
			minHeight: "6em",
			overflow: "hidden"
		};

		const labelStyle: React.CSSProperties = {
			fontWeight: 600,
			marginBottom: "0.3em"
		};

		return (
			<Flex direction="column" style={{ height: "100vh", minHeight: 0, gap: "1em", padding: "1em" }}>
				<h1 style={{ margin: 0 }}>Aici Settings</h1>
				<p style={{ marginTop: 0, color: "var(--vscode-descriptionForeground)" }}>
					Non-secret values are saved to `.vscode/settings.json` (repository-relative). The AI Key is stored securely in VS Code Secrets.
				</p>

				<div style={{ borderTop: "1pt solid var(--vscode-editorWidget-border)", paddingTop: "1em" }}>
					<Flex direction="column" style={{ gap: "0.8em", maxWidth: 800 }}>
						<div>
							<div style={labelStyle}>AI API</div>
							<Select
								value={config.aiApi}
								onChange={(val) => this.setState({ config: { ...config, aiApi: val } })}
								options={[
									{ value: "openai (functions)", label: "openai" },
									{ value: "ollama (not implemented)", label: "ollama" }
								]}
							/>
						</div>

						<div>
							<div style={labelStyle}>AI URL</div>
							<input
								type="text"
								style={inputStyle}
								value={config.aiUrl}
								onChange={(e) => this.setState({ config: { ...config, aiUrl: e.target.value } })}
								placeholder="https://api.openai.com/v1/chat/completions"
							/>
						</div>

						<div>
							<div style={labelStyle}>Default Model</div>
							<input
								type="text"
								style={inputStyle}
								value={config.aiModel}
								onChange={(e) => this.setState({ config: { ...config, aiModel: e.target.value } })}
								placeholder="e.g. gpt-4o or gpt-5-mini"
							/>
						</div>

						<div>
							<div style={labelStyle}>Available Models (one per line)</div>
							<textarea
								ref={this.aiModelsRef}
								style={textareaStyle}
								value={this.state.aiModelsText}
								onChange={(e) => this.setState({ aiModelsText: e.target.value }, () => this.autoSizeTextarea(this.aiModelsRef))}
								placeholder={"gpt-5-nano\ngpt-4o-mini\ngpt-5-mini"}
							/>
						</div>

						<div>
							<div style={labelStyle}>Ignore Regex (one per line)</div>
							<textarea
								ref={this.ignoreRegexRef}
								style={textareaStyle}
								value={this.state.ignoreRegexText}
								onChange={(e) => this.setState({ ignoreRegexText: e.target.value }, () => this.autoSizeTextarea(this.ignoreRegexRef))}
								placeholder={".git\nnode_modules"}
							/>
						</div>

						<div>
							<div style={labelStyle}>Retry Count (AI requests)</div>
							<input
								type="number"
								min={0}
								style={inputStyle}
								value={String(config.aiRetries ?? 3)}
								onChange={(e) => {
									const next = JsonHelper.copy<AiciConfig>(config);
									next.aiRetries = Number(e.target.value || 0);
									this.setState({ config: next });
								}}
								placeholder="Number of retries"
							/>
						</div>

						<div>
							<div style={labelStyle}>Retry Base Delay (AI seconds)</div>
							<input
								type="number"
								min={0}
								style={inputStyle}
								value={String(config.aiRetryDelaySeconds ?? 10)}
								onChange={(e) => {
									const next = JsonHelper.copy<AiciConfig>(config);
									next.aiRetryDelaySeconds = Number(e.target.value || 0);
									this.setState({ config: next });
								}}
								placeholder="Seconds between retries (base)"
							/>
						</div>

						<div>
							<div style={labelStyle}>Update Retry Count (command execution)</div>
							<input
								type="number"
								min={0}
								style={inputStyle}
								value={String(config.updateRetries ?? 3)}
								onChange={(e) => {
									const next = JsonHelper.copy<AiciConfig>(config);
									next.updateRetries = Number(e.target.value || 0);
									this.setState({ config: next });
								}}
								placeholder="Retries for /update command files"
							/>
						</div>

						<div>
							<div style={labelStyle}>Build Retry Count (build command)</div>
							<input
								type="number"
								min={0}
								style={inputStyle}
								value={String(config.buildBuildRetries ?? 5)}
								onChange={(e) => {
									const next = JsonHelper.copy<AiciConfig>(config);
									next.buildBuildRetries = Number(e.target.value || 5);
									this.setState({ config: next });
								}}
								placeholder="Retries for build command"
							/>
						</div>
					</Flex>
				</div>

				<div style={{ borderTop: "1pt solid var(--vscode-editorWidget-border)", paddingTop: "1em" }}>
					<h2 style={{ marginTop: 0 }}>AI Key (Secret)</h2>
					<Flex direction="column" style={{ gap: "0.8em", maxWidth: 800 }}>
						<div>
							<div style={labelStyle}>AI Key</div>
							<input
								style={inputStyle}
								value={this.state.config.aiKey}
								onChange={(e) => {
									const newConfig = JsonHelper.copy<AiciConfig>(this.state.config);
									newConfig.aiKey = e.target.value;
									this.setState({ config: newConfig });
								}}
								placeholder="Enter your AI key"
							/>
						</div>
					</Flex>
				</div>

				<Flex direction="row">
					<Button onClick={this.onSave.bind(this)}>Save</Button>
				</Flex>
			</Flex>
		);
	}
}

// Mount
window.addEventListener("load", () => {
	const rootElement = document.getElementById("root");
	if (rootElement) {
		const root = createRoot(rootElement);
		root.render(<SettingsWebview />);
	}
});
