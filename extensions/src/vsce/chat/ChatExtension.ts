import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { PostMessageServer } from "./PostMessageServer";
import { BaseExtension } from "../BaseExtension";
import { Conversation } from "@lvt/aici-library/dist/llm/Conversation";

export class ChatExtension extends BaseExtension {
	protected override getVsceCommand(): string {
		return "openChat";
	}

	protected override getTitle(): string {
		return "Aici Chat";
	}

	protected override getWebpackName(): string {
		return "chat";
	}

	protected override getPostMessageServer(): PostMessageServer {
		return new PostMessageServer(this.panel!);
	}

	protected override async tryOpenCustomEditor(...args: unknown[]): Promise<boolean> {
		const resourceArg = (args && args.length > 0 && args[0] instanceof vscode.Uri) ? args[0] as vscode.Uri : undefined;
		const baseDir = await this.getTargetDirectory(resourceArg);

		if (!baseDir)
			return false;

		const target = await this.createNewConvoFile(baseDir);
		await vscode.workspace.fs.stat(target);
		await vscode.commands.executeCommand("vscode.openWith", target, "aici.chat");
		return true;
	}

	private async getTargetDirectory(resourceArg?: vscode.Uri): Promise<vscode.Uri | undefined> {
		if (resourceArg && resourceArg.scheme === "file") {
			try {
				const stat = await vscode.workspace.fs.stat(resourceArg);
				if (stat.type & vscode.FileType.Directory)
					return resourceArg;
				return vscode.Uri.file(path.dirname(resourceArg.fsPath));
			} catch { }
		}

		const active = vscode.window.activeTextEditor?.document.uri;
		if (active && active.scheme === "file") {
			return vscode.Uri.file(path.dirname(active.fsPath));
		}

		const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
		if (folder)
			return folder;

		return undefined;
	}

	private async readBundledSystemPrompt(): Promise<string> {
		const ext = vscode.extensions.getExtension("LagoVistaTechnologies.aici");
		if (!ext || !ext.extensionPath) return "";

		const candidates = [
			path.join(ext.extensionPath, "dist", "llm", "workflows", "prompts", "000-system.md"),
			path.join(ext.extensionPath, "src", "llm", "workflows", "prompts", "000-system.md"),
			path.join(ext.extensionPath, "llm", "workflows", "prompts", "000-system.md"),
		];
		for (const cand of candidates) {
			try {
				const content = await fs.readFile(cand, "utf8");
				if (content) return content;
			} catch {
				// ignore and try next
			}
		}
		return "";
	}

	private async createNewConvoFile(dir: vscode.Uri): Promise<vscode.Uri> {
		const name = await this.nextAvailableName(dir);
		const target = vscode.Uri.file(path.join(dir.fsPath, name));

		const systemPrompt = await this.readBundledSystemPrompt();

		const convo: Conversation = {
			dated: new Date().toISOString(),
			title: "",
			messages: [
				{ role: "system", content: systemPrompt }
			]
		};
		const bytes = new TextEncoder().encode(JSON.stringify(convo, null, "\t"));
		await vscode.workspace.fs.writeFile(target, bytes);

		return target;
	}

	private async nextAvailableName(dir: vscode.Uri): Promise<string> {
		const base = "untitled";
		const ext = ".convo";

		for (let i = 1; i < 1000; i++) {
			const suffix = i === 1 ? "" : `${i}`;
			const candidate = `${base}${suffix}${ext}`;
			const uri = vscode.Uri.file(path.join(dir.fsPath, candidate));
			if (!(await this.exists(uri)))
				return candidate;
		}

		return `${base}-${Date.now()}${ext}`;
	}

	private async exists(uri: vscode.Uri): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}
}