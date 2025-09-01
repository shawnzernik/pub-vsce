import { PostMessageServer } from "./PostMessageServer";
import { BaseExtension } from "../BaseExtension";
import * as vscode from "vscode";

export class SettingsExtension extends BaseExtension {
	protected override getVsceCommand(): string {
		return "openSettings";
	}
	protected override getTitle(): string {
		return "Aici Settings";
	}
	protected override getWebpackName(): string {
		return "settings";
	}
	protected override getPostMessageServer(): PostMessageServer {
		return new PostMessageServer(this.panel!, vscode.workspace.workspaceFolders![0]!.uri!);
	}
}
