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

		let nis = await NoninteractiveShell.execute("git diff", { cwd: this.repository.root });
		if (nis.error)
			throw new Error(`git diff failed:\n\n${nis.output}`);

		let prompt = await this.readBundledPrompt("commit/100-send-diff.md");
		prompt = prompt.replace(/{{diff}}/g, nis.output);
		const response = await this.sendUserMessage(prompt);

		const output: string[] = [];

		nis = await NoninteractiveShell.execute("git add .", { cwd: this.repository.root });
		if (nis.error)
			throw new Error(`'git add .' failed:\n\n${nis.output}`);
		output.push("git add .", nis.output.trim());

		const commitMessage = response.trim();
		const tempFile = path.join(os.tmpdir(), `aici-commit-msg-${Date.now()}.txt`);
		fs.writeFileSync(tempFile, commitMessage, "utf8");

		output.push(`git commit -F "${tempFile}"`);
		nis = await NoninteractiveShell.execute(`git commit -F "${tempFile}"`, { cwd: this.repository.root });
		fs.unlinkSync(tempFile);
		if (nis.error)
			throw new Error(`'git commit -F "${tempFile}"' failed:\n\n${nis.output}`);
		output.push(nis.output.trim());

		prompt = await this.readBundledPrompt("commit/200-final-msg.md");
		prompt = prompt.replace(/{{output}}/g, output.join("\n\n"));
		await this.sendUserMessage(prompt);
	}
}
