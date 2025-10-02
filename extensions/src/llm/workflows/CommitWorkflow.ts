import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { Config } from "../../config";
import { NoninteractiveShell } from "../../system/NoninteractiveShell";

export class CommitWorkflow extends WorkflowBase {
	public static create(
		config: Config,
		repository: Repository,
		updater: (me: WorkflowBase) => void = () => { }
	): CommitWorkflow {
		return new CommitWorkflow(config, repository, updater);
	}

	protected override async execute(): Promise<void> {
		if (!this.request) throw new Error("Request not initialized");

		const workspaceRoot = this.repository.root;
		const gitRoots = await this.findGitRoots(workspaceRoot);

		// Process gitRoots from deepest (leaf) to shallowest (root)
		for (const gitRoot of gitRoots) {
			try {
				const nis = await NoninteractiveShell.execute("git diff", { cwd: gitRoot });
				if (nis.error) throw new Error(`git diff failed at ${gitRoot}:\n${nis.output}`);

				let prompt = await this.readBundledPrompt("commit/100-send-diff.md");
				prompt = prompt.replace(/{{diff}}/g, nis.output);

				const response = await this.sendUserMessage(prompt);

				const addResult = await NoninteractiveShell.execute("git add .", { cwd: gitRoot });
				if (addResult.error) throw new Error(`git add . failed at ${gitRoot}:\n${addResult.output}`);

				const tempFilePath = this.createTempCommitFile(response);
				const commitCmd = `git commit -F \"${tempFilePath}\"`;
				const commitResult = await NoninteractiveShell.execute(commitCmd, { cwd: gitRoot });
				this.deleteTempCommitFile(tempFilePath);

				if (commitResult.error) throw new Error(`git commit failed at ${gitRoot}:\n${commitResult.output}`);

				prompt = await this.readBundledPrompt("commit/200-final-msg.md");
				prompt = prompt.replace(/{{output}}/g, [addResult.output.trim(), commitResult.output.trim()].join("\n\n"));
				await this.sendUserMessage(prompt);

			} catch (err) {
				this.appendAssistantMessage(`Error processing git repo at ${gitRoot}: ${(err as Error).message}`);
			}
		}
	}

	private async findGitRoots(root: string): Promise<string[]> {
		const gitRoots = new Set<string>();

		const collectedFolders = await this.collectFoldersRecursively(root);

		for (const folder of collectedFolders) {
			try {
				const nis = await NoninteractiveShell.execute("git rev-parse --show-toplevel", { cwd: folder });
				if (!nis.error && nis.output) {
					gitRoots.add(nis.output.trim());
				}
			} catch { /* ignore */ }
		}

		const sortedRoots = Array.from(gitRoots).sort((a, b) => {
			const depthA = a.split(/[\\\/]/).length;
			const depthB = b.split(/[\\\/]/).length;
			return depthB - depthA; // deep paths first
		});

		return sortedRoots;
	}

	private async collectFoldersRecursively(root: string): Promise<string[]> {
		const folders: string[] = [];
		const toVisit = [root];

		while (toVisit.length > 0) {
			const folder = toVisit.pop()!;
			folders.push(folder);

			const entries = await fs.promises.readdir(folder, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					if (entry.name === "node_modules" || entry.name === ".git") continue;
					toVisit.push(path.join(folder, entry.name));
				}
			}
		}

		return folders;
	}

	private createTempCommitFile(message: string): string {
		const tmpFile = path.join(os.tmpdir(), `aici-commit-msg-${Date.now()}.txt`);
		fs.writeFileSync(tmpFile, message, "utf8");
		return tmpFile;
	}

	private deleteTempCommitFile(filePath: string): void {
		try {
			fs.unlinkSync(filePath);
		} catch {
			// ignore
		}
	}
}
