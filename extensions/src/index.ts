import * as vscode from "vscode";
import { ChatExtension } from "./vsce/chat/ChatExtension";
import { HelpExtension } from "./vsce/help/HelpExtension";
import { PostMessageServer } from "./vsce/chat/PostMessageServer";
import { Repository } from "./system/Repository";
import { TextDocumentEditorProvider } from "./vsce/chat/TextDocumentEditorProvider";
import { File } from "@lvt/aici-library/dist/llm/File";
import { Config } from "./config";
import { SettingsExtension } from "./vsce/settings/SettingsExtension";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// Initialize config/secret storage
	await Config.setSecretStorage(context);

	new HelpExtension(context);
	new ChatExtension(context);
	new SettingsExtension(context);

	context.subscriptions.push(
		TextDocumentEditorProvider.register(context),
		vscode.commands.registerCommand("aici.collectPaths", async (resource: unknown) => {
			const uri = resource instanceof vscode.Uri ? resource : vscode.window.activeTextEditor?.document.uri;
			if (!uri) {
				vscode.window.showInformationMessage("Aici: No file or folder selected.");
				return;
			}

			let repo: Repository;
			try {
				repo = await Repository.instance(uri);
			} catch (err) {
				vscode.window.showInformationMessage(`Aici: Failed to locate repository: ${String((err as Error)?.message || err)}`);
				return;
			}

			let fileList: string[];
			try {
				fileList = await repo.list(uri.fsPath);
			} catch (err) {
				vscode.window.showInformationMessage(`Aici: Failed to list files: ${String((err as Error)?.message || err)}`);
				return;
			}

			if (!fileList || fileList.length === 0) {
				vscode.window.showInformationMessage("Aici: No files found to send.");
				return;
			}

			const files: File[] = [];
			for (const fileName of fileList) {
				try {
					const newFile: File = {
						name: fileName,
						contents: repo.read(fileName)
					};
					files.push(newFile);
				} catch (err) {
					// Skip unreadable file but continue with others
					console.warn(`Aici: Skipping unreadable file '${fileName}':`, err);
				}
			}

			const delivered = [...PostMessageServer.servers].length > 0 ? PostMessageServer.broadcastRepositoryFiles(files) : 0;
			if (delivered === 0)
				vscode.window.showInformationMessage("Aici: No Chat webviews are open.");
		})
	);
}

export function deactivate(): Promise<void> {
	return Promise.resolve();
}
