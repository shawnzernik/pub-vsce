import * as React from "react";
import { createRoot } from "react-dom/client";
import { Flex } from "../../components/Flex";
import { Button } from "../../components/Button";
import { PostMessageClient } from "./PostMessageClient";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";
import "../../../static/help.css";

interface State {
	response: string;
}
interface Properties { }

export class HelpWebview extends React.Component<Properties, State> {
	private pmClient: PostMessageClient;

	public constructor(props: Properties) {
		super(props);
		this.pmClient = new PostMessageClient(this);
	}

	public override state: State = {
		response: "",
	};

	private helloClicked(): void {
		this.pmClient!.send(PostMessageTypes.Hello, null);
	}

	public override render(): React.ReactNode {
		return <>
			<h1>Aici - AI Continuous Improvement</h1>
			<p>Copyright &copy; 2025 Shawn Zernik</p>

			<p>This program is free software: you can redistribute it and/or modify
				it under the terms of the GNU Affero General Public License as published by
				the Free Software Foundation, either version 3 of the License, or
				(at your option) any later version.</p>

			<p>This program is distributed in the hope that it will be useful,
				but WITHOUT ANY WARRANTY; without even the implied warranty of
				MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
				GNU Affero General Public License for more details.</p>

			<p>You should have received a copy of the GNU Affero General Public License
				along with this program. If not, see <a href="http://www.gnu.org/licenses/">http://www.gnu.org/licenses/</a>.</p>

			<h2>Key Bindings</h2>
			<p>By default, we've used the following key bindings:</p>
			<ul>
				<li><b>ctrl+shift+c</b> - Creates a convo file and opens chat.</li>
			</ul>
			<p>You can open Help via the Command Palette: <b>Aici: Open Aici Help</b>.</p>

			<h2>Configuration</h2>
			<p>You'll want to edit your repository settings file <code>.vscode/settings.json</code> to include the following settings:</p>
			<pre>{`
{
	"aici.aiApi": "openai",
	"aici.aiUrl": "https://api.openai.com/v1/chat/completions",
	"aici.aiModel": "gpt-4o-mini",
	"aici.ignoreRegex": [
		".*/node_modules/.*"
	],
	"aici.aiModels": [
		"gpt-5-nano",
		"gpt-4o-mini",
		"gpt-5-mini",
		"gpt-4o",
		"chatgpt-4o-latest"
	]
}
			`}</pre>
			<p>The AI Key is stored securely in VS Code SecretStorage via the Aici Settings UI. You may also set it via environment variables (fallback): <code>AICI_AIKEY</code> or <code>OPENAI_API_KEY</code>.</p>

			<h2> Post Message Testing</h2>
			<Flex>
				<Button onClick={this.helloClicked.bind(this)}>Hello</Button>
			</Flex>
			<div>{this.state.response}</div>
		</>;
	}
}

window.addEventListener("load", () => {
	const rootElement = document.getElementById("root");
	if (rootElement) {
		const root = createRoot(rootElement);
		root.render(<HelpWebview />);
	}
});