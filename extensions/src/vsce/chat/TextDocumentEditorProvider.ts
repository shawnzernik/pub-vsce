import * as vscode from "vscode";
import * as path from "path";
import { TextDocument } from "./TextDocument";
import { PostMessageServer } from "./PostMessageServer";
import { File } from "@lvt/aici-library/dist/llm/File";
import { BaseExtension } from "../BaseExtension";

export class TextDocumentEditorProvider implements vscode.CustomEditorProvider<TextDocument> {
	private readonly context: vscode.ExtensionContext;
	private readonly onDidChangeCustomDocumentEventEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<TextDocument>>();
	/* interface */ public readonly onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentContentChangeEvent<TextDocument>> = this.onDidChangeCustomDocumentEventEmitter.event;

	private readonly serversByDoc = new Map<string, Set<PostMessageServer>>();

	public constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new TextDocumentEditorProvider(context);
		return vscode.window.registerCustomEditorProvider("aici.chat", provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: true
		});
	}

	/* interface */ public async openCustomDocument(
		uri: vscode.Uri,
		_openContext: vscode.CustomDocumentOpenContext,
		_token: vscode.CancellationToken
	): Promise<TextDocument> {
		return TextDocument.create(uri);
	}

	/* interface */ public async resolveCustomEditor(
		document: TextDocument,
		panel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, "static"))]
		};

		await BaseExtension.bindWebpackToWebview(panel, this.context, "chat", "Aici Chat");

		const server = new PostMessageServer(
			panel,
			document.uri,
			() => this.getSnapshot(document),
			(file: File) => {
				document.setContent(file.contents);
				this.onDidChangeCustomDocumentEventEmitter.fire({ document });
			}
		);

		this.track(document.uri.toString(), server, panel);
		panel.webview.onDidReceiveMessage(server.handle.bind(server));
	}

	/* interface */ public async saveCustomDocument(
		document: TextDocument,
		_token: vscode.CancellationToken
	): Promise<void> {
		await this.write(document.uri, document.content);
	}

	/* interface */ public async saveCustomDocumentAs(
		document: TextDocument,
		targetResource: vscode.Uri,
		_token: vscode.CancellationToken
	): Promise<void> {
		await this.write(targetResource, document.content);
	}

	/* interface */ public async revertCustomDocument(
		document: TextDocument,
		_token: vscode.CancellationToken
	): Promise<void> {
		if (document.uri.scheme === "untitled")
			return;

		const bytes = await vscode.workspace.fs.readFile(document.uri);
		document.setContent(new TextDecoder("utf8").decode(bytes));
		this.onDidChangeCustomDocumentEventEmitter.fire({ document });
		this.broadcastFileLoaded(document);
	}

	/* interface */ public async backupCustomDocument(
		document: TextDocument,
		context: vscode.CustomDocumentBackupContext,
		_token: vscode.CancellationToken
	): Promise<vscode.CustomDocumentBackup> {
		await this.write(context.destination, document.content);
		return {
			id: context.destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(context.destination);
				} catch { }
			}
		};
	}

	private async write(uri: vscode.Uri, content: string): Promise<void> {
		if (uri.scheme === "untitled")
			return;

		const bytes = new TextEncoder().encode(content);
		await vscode.workspace.fs.writeFile(uri, bytes);
	}

	private getSnapshot(document: TextDocument): File {
		return {
			name: document.uri.fsPath,
			contents: document.content
		};
	}

	private track(key: string, server: PostMessageServer, panel: vscode.WebviewPanel): void {
		let set = this.serversByDoc.get(key);
		if (!set) {
			set = new Set<PostMessageServer>();
			this.serversByDoc.set(key, set);
		}
		set.add(server);

		panel.onDidDispose(() => {
			const s = this.serversByDoc.get(key);
			if (!s)
				return;
			s.delete(server);
			if (s.size === 0)
				this.serversByDoc.delete(key);
		});
	}

	private broadcastFileLoaded(document: TextDocument): void {
		const set = this.serversByDoc.get(document.uri.toString());
		if (!set)
			return;

		const snap = this.getSnapshot(document);
		for (const srv of set)
			srv.sendFileLoaded(snap);
	}
}
