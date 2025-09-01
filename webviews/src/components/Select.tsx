import * as React from "react";

export type OptionItem = string | { value: string; label?: string };

export interface SelectProps {
	value?: string;
	onChange?: (value: string) => void;
	options?: OptionItem[];
	style?: React.CSSProperties;
	children?: React.ReactNode;
	disabled?: boolean;
	className?: string;
}

export class Select extends React.Component<SelectProps> {
	private static defaultStyles: React.CSSProperties = {
		padding: "0.2em 0.5em",
		borderRadius: "4px",
		border: "1px solid var(--vscode-editorWidget-border)",
		background: "var(--vscode-input-background, var(--vscode-editorWidget-background))",
		color: "var(--vscode-input-foreground, var(--vscode-editor-foreground))",
		fontFamily: "var(--vscode-font-family, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif)",
		fontSize: "0.95em",
		boxSizing: "border-box",
		minHeight: "1.8em",
		cursor: "pointer"
	};

	public constructor(props: SelectProps) {
		super(props);
		this.onChange = this.onChange.bind(this);
	}

	private onChange(e: React.ChangeEvent<HTMLSelectElement>) {
		if (this.props.onChange) this.props.onChange(e.target.value);
	}

	private renderOption(opt: OptionItem, idx: number) {
		if (typeof opt === "string") {
			return <option key={idx} value={opt}>{opt}</option>;
		}
		return <option key={idx} value={opt.value}>{opt.label ?? opt.value}</option>;
	}

	public override render(): React.ReactNode {
		const { value = "", options = [], children, disabled, className } = this.props;
		const combined: React.CSSProperties = {
			...Select.defaultStyles,
			...(this.props.style || {}),
		};

		return (
			<select
				className={className}
				style={combined}
				value={value}
				onChange={this.onChange}
				disabled={disabled}
			>
				{options.map((o, i) => this.renderOption(o, i))}
				{children}
			</select>
		);
	}
}