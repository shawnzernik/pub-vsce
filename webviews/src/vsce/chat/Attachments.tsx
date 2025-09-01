import * as React from "react";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Flex } from "../../components/Flex";

export interface Properties {
	model: File[];
	onChange: (files: File[]) => void;
}

export class Attachments extends React.Component<Properties> {
	public constructor(props: Properties) {
		super(props);
	}

	private remove(index: number): void {
		const next = this.props.model.slice();
		next.splice(index, 1);
		this.props.onChange(next);
	}

	public override render(): React.ReactNode {
		if (!this.props.model || this.props.model.length === 0)
			return null;

		return (
			<Flex
				direction="row"
				style={{
					borderTop: "1pt solid var(--vscode-editorWidget-border)",
					marginTop: "1em",
					paddingTop: "1em",
					gap: "0.5em",
					flexWrap: "wrap",
					alignItems: "center"
				}}
			>
				<table>
					<thead>
						<th>File</th>
						<th>Length</th>
						<th>Lines</th>
					</thead>
					<tbody>
						{this.props.model.map((f, i) => (
							<tr key={i} onDoubleClick={this.remove.bind(this, i)}>
								<td>{f.name}</td>
								<td>{f.contents.length}</td>
								<td>{f.contents.search("\n")}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Flex>
		);
	}
}