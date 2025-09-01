import * as React from "react";

export interface FlexProps {
	direction?: "row" | "column";
	justifyContent?: React.CSSProperties["justifyContent"];
	alignItems?: React.CSSProperties["alignItems"];
	flexWrap?: React.CSSProperties["flexWrap"];
	style?: React.CSSProperties;
	children?: React.ReactNode;
	gap?: string;
	onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
}

export class Flex extends React.Component<FlexProps> {
	private static defaultStyles: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
		justifyContent: "flex-start",
		alignItems: "stretch",
		flexWrap: "nowrap",
	};

	public constructor(props: FlexProps) {
		super(props);
	}

	public override render(): React.ReactNode {
		const combined: React.CSSProperties = {
			...Flex.defaultStyles,
			gap: this.props.gap || "",
			flexDirection: this.props.direction || Flex.defaultStyles.flexDirection,
			justifyContent: this.props.justifyContent || Flex.defaultStyles.justifyContent,
			alignItems: this.props.alignItems || Flex.defaultStyles.alignItems,
			flexWrap: this.props.flexWrap || Flex.defaultStyles.flexWrap,
			...(this.props.style || {}),
		};

		return <div style={combined} onDoubleClick={this.props.onDoubleClick}>{this.props.children}</div>;
	}
}
