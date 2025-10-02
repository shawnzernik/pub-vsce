import * as React from "react";
import { Message as MessageDto } from "@lvt/aici-library/dist/llm/Message";
import { Flex } from "../../components/Flex";
import { ChatRendering } from "./ChatWebview";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

import CopyIcon from "bootstrap-icons/icons/clipboard.svg";
import SaveIcon from "bootstrap-icons/icons/save.svg";

function isVsCodeDarkMode(): boolean {
	const bodyClassList = document.body.classList;
	return bodyClassList.contains("vscode-dark") || bodyClassList.contains("vscode-high-contrast");
}

function updateHighlightStyles(): void {
	if (isVsCodeDarkMode()) {
		// import("highlight.js/styles/stackoverflow-dark.css");
		import("highlight.js/styles/github-dark.css");
	} else {
		// import("highlight.js/styles/stackoverflow-light.css");
		import("highlight.js/styles/github.css");
	}
}

// Initial load
updateHighlightStyles();

// Watch for body class changes
const observer = new MutationObserver(() => {
	updateHighlightStyles();
});

observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

// Clean up observer when no longer needed
window.addEventListener("unload", () => observer.disconnect());

declare const acquireVsCodeApi: any;

export interface Properties {
	format: ChatRendering;
	model: MessageDto;
	onChange: (msg: MessageDto) => void;
	onSend: () => void;
	onActivate?: (() => void) | undefined;
	onSaveSnippet: (text: string, filename: string) => void;
}

export interface State {
	editing: boolean;
	draft: string;
}

const rGfm: any = (remarkGfm as any)?.default ?? (remarkGfm as any);
const rRaw: any = (rehypeRaw as any)?.default ?? (rehypeRaw as any);
const rHighlight: any = (rehypeHighlight as any)?.default ?? (rehypeHighlight as any);

const HLJS_OPTIONS = {
	detect: true,
	ignoreMissing: true,
	plainText: ["", "text", "plaintext", "txt"],
	aliases: {
		tsx: "typescript",
		ts: "typescript",
		jsx: "javascript",
		js: "javascript",
		shell: "bash",
		sh: "bash",
		zsh: "bash",
		ps: "powershell",
		ps1: "powershell",
		csharp: "cs",
		yml: "yaml",
		md: "markdown",
		plaintext: "text",
		txt: "text"
	}
};

export class Message extends React.PureComponent<Properties, State> {
	private textareaEl: HTMLTextAreaElement | null = null;
	private themeObserver?: MutationObserver;

	public constructor(props: Properties) {
		super(props);
		this.state = {
			editing: false,
			draft: props.model?.content || ""
		};
	}

	public override componentDidMount(): void {
		if (this.state.editing)
			this.autoSize();
	}

	public override componentDidUpdate(prevProps: Properties, prevState: State): void {
		if (!this.state.editing && (prevProps.model?.content !== this.props.model?.content))
			this.setState({ draft: this.props.model?.content || "" });

		if (this.state.editing && !prevState.editing) {
			this.autoSize();
			this.textareaEl?.focus();
		}

		if (this.state.editing && prevState.draft !== this.state.draft)
			this.autoSize();
	}

	public override componentWillUnmount(): void {
		this.themeObserver?.disconnect();
	}

	public override shouldComponentUpdate(nextProps: Properties, nextState: State): boolean {
		return (
			nextProps.format !== this.props.format ||
			nextProps.model.role !== this.props.model.role ||
			nextProps.model.content !== this.props.model.content ||
			nextState.editing !== this.state.editing ||
			nextState.draft !== this.state.draft
		);
	}

	private setTextareaRef(el: HTMLTextAreaElement | null): void {
		this.textareaEl = el;
	}

	private enterEdit(): void {
		this.setState({ editing: true, draft: this.props.model?.content || "" }, () => this.autoSize());
	}

	private commitEdit(): void {
		const next = this.state.draft || "";
		const model = (this.props.model as MessageDto | undefined);
		if (!model) {
			this.setState({ editing: false });
			return;
		}
		const prevContent = model.content || "";
		if (next !== prevContent) {
			const updated: MessageDto = { role: model.role, content: next };
			this.props.onChange(updated);
		}
		this.setState({ editing: false });
	}

	private cancelEdit(): void {
		this.setState({ editing: false, draft: this.props.model?.content || "" });
	}

	private autoSize(): void {
		const el = this.textareaEl;
		if (!el)
			return;

		requestAnimationFrame(() => {
			el.style.height = "auto";
			const h = el.scrollHeight + 2;
			el.style.height = `${h}px`;
		});
	}

	private onTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
		this.setState({ draft: event.target.value });
	}

	private onTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
		if ((event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
			event.preventDefault();
			this.commitEdit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			this.cancelEdit();
		}
	}

	private onDoubleClick(): void {
		if (this.props.model?.role === "user" && this.props.onActivate) {
			this.props.onActivate();
			return;
		}
		this.enterEdit();
	}

	private async copyToClipboard(text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			try { document.execCommand("copy"); } catch { }
			document.body.removeChild(ta);
		}
	}

	private saveToFile(text: string, lang: string): void {
		const filename = this.suggestFilename(lang);
		this.props.onSaveSnippet(text, filename);
	}

	private suggestFilename(lang: string): string {
		const ext = this.langToExt(lang);
		return `snippet${ext}`;
	}

	private langToExt(lang: string): string {
		const l = (lang || "").toLowerCase();
		const map: Record<string, string> = {
			"typescript": ".ts",
			"ts": ".ts",
			"tsx": ".tsx",
			"javascript": ".js",
			"js": ".js",
			"jsx": ".jsx",
			"json": ".json",
			"css": ".css",
			"scss": ".scss",
			"sass": ".sass",
			"html": ".html",
			"md": ".md",
			"markdown": ".md",
			"python": ".py",
			"py": ".py",
			"bash": ".sh",
			"sh": ".sh",
			"zsh": ".sh",
			"powershell": ".ps1",
			"ps1": ".ps1",
			"csharp": ".cs",
			"cs": ".cs",
			"java": ".java",
			"kt": ".kt",
			"kotlin": ".kt",
			"go": ".go",
			"rust": ".rs",
			"rs": ".rs",
			"cpp": ".cpp",
			"c++": ".cpp",
			"c": ".c",
			"h": ".h",
			"xml": ".xml",
			"yaml": ".yml",
			"yml": ".yml",
			"toml": ".toml",
			"dockerfile": "Dockerfile",
			"makefile": "Makefile",
			"text": ".txt",
			"": ".txt"
		};
		const ext = map[l];
		if (ext && !ext.startsWith("."))
			return ext;
		return ext || ".txt";
	}

	private flattenToText(node: any): string {
		if (node === null || node === undefined)
			return "";
		if (typeof node === "string" || typeof node === "number")
			return String(node);
		if (Array.isArray(node))
			return node.map((n) => this.flattenToText(n)).join("");
		if (React.isValidElement(node)) {
			const props: any = (node as any).props;
			return this.flattenToText(props?.children);
		}
		return "";
	}

	private renderInlineCode = ({ className, children, ...props }: any) => {
		return (
			<code className={className ?? ""} {...props}>
				{children}
			</code>
		);
	};

	private renderPreBlock = ({ children }: any) => {
		const codeEl = Array.isArray(children) ? children.find((c: any) => c && c.type === "code") : children;
		const codeProps = (codeEl && (codeEl as any).props) || {};
		const className: string = codeProps.className ?? "";
		const lang = /language-(\S+)/.exec(className)?.[1] ?? "text";
		const text = this.flattenToText(codeProps.children ?? "");

		return (
			<div className="md-codeblock">
				<div className="md-codeblock__header">
					<span className="md-codeblock__lang">{lang}</span>
					<div className="md-codeblock__actions">
						<button
							className="md-iconbtn"
							type="button"
							title="Copy code"
							onClick={async (e) => {
								e.stopPropagation();
								await this.copyToClipboard(text);
								const btn = e.currentTarget;
								const oldTitle = btn.title;
								btn.title = "Copied!";
								setTimeout(() => (btn.title = oldTitle), 1200);
							}}
						>
							<CopyIcon width={16} height={16} />
						</button>
						<button
							className="md-iconbtn"
							type="button"
							title="Save code"
							onClick={(e) => {
								e.stopPropagation();
								this.saveToFile(text, lang);
							}}
						>
							<SaveIcon width={16} height={16} />
						</button>
					</div>
				</div>
				<pre>
					{children}
				</pre>
			</div>
		);
	};

	private renderViewBody(): React.ReactNode {
		const content = this.props.model?.content || "";

		if (this.props.format === "pre")
			return <pre>{content}</pre>;

		return (
			<ReactMarkdown
				remarkPlugins={[rGfm]}
				rehypePlugins={[
					[rRaw],
					[rHighlight, HLJS_OPTIONS]
				]}
				components={{
					code: this.renderInlineCode,
					pre: this.renderPreBlock
				}}
			>
				{content}
			</ReactMarkdown>
		);
	}

	private renderEditBody(): React.ReactNode {
		return (
			<textarea
				ref={this.setTextareaRef.bind(this)}
				value={this.state.draft}
				onChange={this.onTextareaChange.bind(this)}
				onBlur={this.commitEdit.bind(this)}
				onKeyDown={this.onTextareaKeyDown.bind(this)}
				style={{
					width: "100%",
					maxWidth: "100%",
					boxSizing: "border-box",
					resize: "none",
					overflow: "hidden",
					whiteSpace: "pre-wrap",
					fontFamily:
						"var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace)",
					fontSize: "0.95em",
					lineHeight: 1.6,
					padding: "0.6em 0.8em",
					border: "1px solid var(--vscode-editorWidget-border)",
					borderRadius: "6px",
					background: "var(--vscode-textBlockQuote-background)",
					color: "var(--vscode-editor-foreground)"
				}}
			/>
		);
	}

	public override render(): React.ReactNode {
		const body = this.state.editing ? this.renderEditBody() : this.renderViewBody();
		const role = this.props.model?.role ?? "";

		return (
			<Flex direction="column" onDoubleClick={this.onDoubleClick.bind(this)} style={{ width: "100%", maxWidth: "100%" }}>
				<h1>{role}</h1>
				<hr style={{ border: "0", borderTop: "1pt solid grey", width: "100%" }} />
				<div className="message-container">
					{body}
				</div>
			</Flex>
		);
	}
}