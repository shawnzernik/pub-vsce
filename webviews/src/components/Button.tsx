import * as React from "react";

export interface ButtonProps {
	label?: string;
	onClick?: () => void;
	style?: React.CSSProperties;
	children?: React.ReactNode;
}

export class Button extends React.Component<ButtonProps> {
	private static defaultStyles: React.CSSProperties = {
		backgroundColor: "var(--vscode-button-background)",
		color: "var(--vscode-button-foreground)",
		border: "none",
		padding: "0.25em 0.75em",
		cursor: "pointer",
		borderRadius: "0.25em",
		fontSize: "1em",
		lineHeight: "1.4",
	};

	public constructor(props: ButtonProps) {
		super(props);
	}

	public override render(): React.ReactNode {
		const combined: React.CSSProperties = {
			...Button.defaultStyles,
			...(this.props.style || {}),
		};

		const content = this.props.children ?? this.props.label ?? "";

		return (
			<button style={combined} onClick={this.props.onClick}>
				{content}
			</button>
		);
	}
}
