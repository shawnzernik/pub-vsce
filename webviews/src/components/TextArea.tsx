import * as React from "react";

export interface TextAreaProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	style?: React.CSSProperties;
	rows?: number;
	height?: number | string;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
	disabled?: boolean;
	className?: string;
}

export class TextArea extends React.Component<TextAreaProps> {
	private static defaultStyles: React.CSSProperties = {
		width: "100%",
		boxSizing: "border-box",
		resize: "none",
		overflow: "auto",
		fontFamily: "var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace)",
		fontSize: "0.95em",
		lineHeight: 1.6,
		padding: "0.6em 0.8em",
		border: "1px solid var(--vscode-editorWidget-border)",
		borderRadius: "6px",
		background: "var(--vscode-input-background, var(--vscode-textBlockQuote-background))",
		color: "var(--vscode-input-foreground, var(--vscode-editor-foreground))",
		outline: "none",
	};

	public constructor(props: TextAreaProps) {
		super(props);
		this.onChange = this.onChange.bind(this);
	}

	private onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		if (this.props.onChange) this.props.onChange(e.target.value);
	}

	public override render(): React.ReactNode {
		const { value = "", placeholder, rows, height, onKeyDown, onBlur, disabled, className } = this.props;
		const combined: React.CSSProperties = {
			...TextArea.defaultStyles,
			...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
			...(this.props.style || {}),
		};

		return (
			<textarea
				className={className}
				style={combined}
				value={value}
				placeholder={placeholder}
				rows={rows}
				onChange={this.onChange}
				onKeyDown={onKeyDown}
				onBlur={onBlur}
				disabled={disabled}
			/>
		);
	}
}