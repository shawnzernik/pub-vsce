import * as React from "react";
import { Message } from "@lvt/aici-library/dist/llm/Message";
import { Flex } from "../../components/Flex";
import { Button } from "../../components/Button";

export interface Properties {
	model: Message;
	onChange?: (msg: Message) => void;
	onSend: () => void;
	onReset?: () => void;
}
export interface State {
	height: number;
	text: string;
}

export class NewMessage extends React.Component<Properties, State> {
	private startY = 0;
	private startHeight = 0;
	private dragging = false;

	public constructor(props: Properties) {
		super(props);
		this.state = {
			height: 140,
			text: props.model?.content || ""
		};
	}

	private onTextChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
		this.setState({ text: event.target.value });
	}

	private startDrag(e: React.MouseEvent): void {
		e.preventDefault();
		this.dragging = true;
		this.startY = e.clientY;
		this.startHeight = this.state.height;

		window.addEventListener("mousemove", this.onDrag);
		window.addEventListener("mouseup", this.endDrag);
	}

	private onDrag = (ev: MouseEvent): void => {
		if (!this.dragging)
			return;
		const delta = this.startY - ev.clientY;
		const next = Math.max(60, Math.min(800, Math.round(this.startHeight + delta)));
		this.setState({ height: next });
	};

	private endDrag = (_ev: MouseEvent): void => {
		if (!this.dragging)
			return;
		this.dragging = false;
		window.removeEventListener("mousemove", this.onDrag);
		window.removeEventListener("mouseup", this.endDrag);
	};

	public override componentWillUnmount(): void {
		window.removeEventListener("mousemove", this.onDrag);
		window.removeEventListener("mouseup", this.endDrag);
	}

	public override componentDidUpdate(prevProps: Properties): void {
		if (prevProps.model?.content !== this.props.model?.content) {
			this.setState({ text: this.props.model?.content || "" });
		}
	}

	private handleSend(): void {
		this.props.onSend();
		this.setState({ text: "" });
		this.props.onChange?.({
			role: this.props.model.role,
			content: ""
		});
	}

	private handleReset(): void {
		this.props.onReset?.();
		this.setState({ text: "" });
		this.props.onChange?.({
			role: this.props.model.role,
			content: ""
		});
	}

	public override render(): React.ReactNode {
		return (
			<Flex
				direction="row"
				style={{
					borderTop: "1pt solid var(--vscode-editorWidget-border)",
					paddingBottom: "1em",
					gap: "1em",
					marginTop: "1em",
					paddingTop: "1em",
					alignItems: "center",
					position: "relative"
				}}
			>
				<div
					onMouseDown={this.startDrag.bind(this)}
					style={{
						position: "absolute",
						top: "-6px",
						left: 0,
						right: 0,
						height: "12px",
						cursor: "row-resize",
						background: "transparent",
						zIndex: 5
					}}
					title="Drag to resize new message area"
				/>

				<textarea
					style={{
						width: "100%",
						flexGrow: 1,
						flexShrink: 1,
						height: `${this.state.height}px`,
						boxSizing: "border-box",
						resize: "none",
						overflow: "auto",
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
					value={this.state.text}
					onChange={this.onTextChange.bind(this)}
					onBlur={() => {
						this.props.onChange?.({
							role: this.props.model.role,
							content: this.state.text
						});
					}}
				/>

				<Flex direction="column" alignItems="center" gap="1em" style={{ flexShrink: 0 }}>
					<Button onClick={() => this.handleSend()}>Send</Button>
					<Button onClick={() => this.handleReset()}>Reset</Button>
				</Flex>
			</Flex>
		);
	}
}
