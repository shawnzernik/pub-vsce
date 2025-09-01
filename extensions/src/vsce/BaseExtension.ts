import * as vscode from "vscode";
import { BasePostMessageServer } from "./BasePostMessageServer";
import * as path from "path";

export abstract class BaseExtension {
	protected panel: vscode.WebviewPanel | undefined;
	protected context: vscode.ExtensionContext;

	protected abstract getVsceCommand(): string;
	protected abstract getTitle(): string;
	protected abstract getWebpackName(): string;
	protected abstract getPostMessageServer(): BasePostMessageServer;

	protected async tryOpenCustomEditor(..._args: unknown[]): Promise<boolean> {
		return false;
	}

	public constructor(context: vscode.ExtensionContext) {
		this.context = context;
		const open = this.openWebview.bind(this);
		this.context.subscriptions.push(
			vscode.commands.registerCommand(`aici.${this.getVsceCommand()}`, open)
		);
	}

	public static async bindWebpackToWebview(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, webpackName: string, title: string): Promise<void> {
		panel.title = title;

		const toFsPath = (...parts: string[]) => path.join(context.extensionPath, ...parts);
		const toFileUri = (fsPath: string) => vscode.Uri.file(fsPath);
		const toWebviewUri = (fsPath: string) => panel.webview.asWebviewUri(vscode.Uri.file(fsPath));

		const htmlPath = toFsPath("static", `${webpackName}.html`);
		const bytes = await vscode.workspace.fs.readFile(toFileUri(htmlPath));
		let html = new TextDecoder("utf8").decode(bytes);

		const scriptWebUri = toWebviewUri(toFsPath("static", `${webpackName}.bundle.js`));
		const srcRegex = new RegExp(`src="${webpackName}\\.bundle\\.js"`, "g");
		html = html.replace(srcRegex, `src="${scriptWebUri}"`);

		const cssWebUri = toWebviewUri(toFsPath("static", `${webpackName}.css`));
		const cssRegex = new RegExp(`href="${webpackName}\\.css"`, "g");
		html = html.replace(cssRegex, `href="${cssWebUri}"`);

		const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} https:; script-src ${panel.webview.cspSource}; style-src ${panel.webview.cspSource} 'unsafe-inline';">`;
		html = html.replace(/<head>/, `<head>\n${csp}`);

		panel.webview.html = html;
	}

	private async openWebview(...args: unknown[]): Promise<void> {
		if (await this.tryOpenCustomEditor(...args))
			return;

		if (this.panel) {
			this.panel.reveal();
			return;
		}

		this.panel = vscode.window.createWebviewPanel(
			`aici${this.getVsceCommand()}`,
			this.getTitle(),
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.file(this.context.extensionPath + "/static"),
				],
			}
		);

		await BaseExtension.bindWebpackToWebview(this.panel, this.context, this.getWebpackName(), this.getTitle());

		const server = this.getPostMessageServer();
		this.panel.webview.onDidReceiveMessage(server.handle.bind(server));

		this.panel.onDidDispose(() => {
			this.panel = undefined;
		});
	}
}
