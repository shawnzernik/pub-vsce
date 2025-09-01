import * as vscode from "vscode";

export class TextDocument implements vscode.CustomDocument {
	public static async create(uri: vscode.Uri): Promise<TextDocument> {
		if (uri.scheme === "untitled")
			return new TextDocument(uri, "");

		const bytes = await vscode.workspace.fs.readFile(uri);
		const content = new TextDecoder("utf8").decode(bytes);
		return new TextDocument(uri, content);
	}

	public readonly uri: vscode.Uri;
	private _content: string;
	private _disposed: boolean = false;

	public constructor(uri: vscode.Uri, content: string) {
		this.uri = uri;
		this._content = content;
	}

	public get content(): string {
		return this._content;
	}

	public setContent(content: string): void {
		this._content = content;
	}

	public dispose(): void {
		if (this._disposed)
			return;
		this._disposed = true;
	}
}