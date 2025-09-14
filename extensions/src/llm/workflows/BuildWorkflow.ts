import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { Config } from "../../config";
import { NoninteractiveShell } from "../../system/NoninteractiveShell";
import { PlanWorkflow } from "./PlanWorkflow";
import { UpdateWorkflow } from "./UpdateWorkflow";
import { parseFileFencedBlocks } from "./MarkdownFencedParser";

interface CliCommands {
	clean: string;
	build: string;
}

export class BuildWorkflow extends WorkflowBase {
	public static create(
		config: Config,
		repository: Repository,
		updater: (me: WorkflowBase) => void = () => { }
	): BuildWorkflow {
		return new BuildWorkflow(config, repository, updater);
	}

	protected override async execute(): Promise<void> {
		const cliCommands = await this.getCliCommands();

		let noErrors = await this.runCmd(cliCommands.clean);
		if (!noErrors)
			throw new Error("Clean resulted in errors!");

		const maxIterations = this.config.buildBuildRetries ?? 5;
		for (let attempt = 1; attempt <= maxIterations; attempt++) {
			noErrors = await this.runCmd(cliCommands.build)
			if (noErrors)
				return;

			await this.fixErrors();
		}

		throw new Error("The maximum number of build retries has occurred.")
	}

	private async getCliCommands(): Promise<CliCommands> {
		let prompt = "";

		for (let attempt = 1; attempt <= 2; attempt++) {
			prompt = await this.readBundledPrompt("build/100-get-commands.md");
			const response = await this.sendUserMessage(prompt);

			let jsonText: string | undefined;
			const blocks = parseFileFencedBlocks(response);
			if (blocks.length > 0)
				jsonText = blocks[0]?.contents?.trim() ?? "";
			else
				jsonText = response.trim();

			try {
				const parsed = JSON.parse(jsonText);
				if (typeof parsed.clean !== "string" || typeof parsed.build !== "string") {
					throw new Error("Missing 'clean' or 'build' command string");
				}

				prompt = await this.readBundledPrompt("build/999-done.md");
				await this.sendUserMessage(prompt);

				return { clean: parsed.clean, build: parsed.build };
			} catch (err) {
				if (attempt === 2) {
					throw err;
				}

				const fixPromptTemplate = await this.readBundledPrompt("build/900-self-correct.md");
				const fixPrompt = fixPromptTemplate.replace(/{{text}}/g, response);
				await this.sendUserMessage(fixPrompt);
			}
		}

		throw new Error("Failed to parse CLI commands from LLM response");
	}

	private async runCmd(cmd: string): Promise<boolean> {
		const nis = await NoninteractiveShell.execute(cmd, { cwd: this.repository.root });
		const output = nis.output;

		const detectPromptTemplate = await this.readBundledPrompt(`build/200-error-detect.md`);
		const detectPrompt = detectPromptTemplate.replace(/{{output}}/g, output);
		const response = await this.sendUserMessage(detectPrompt);

		const normalized = response.toLowerCase();
		return normalized.includes("no error");
	}

	private async fixErrors(): Promise<void> {
		let prompt = "";

		prompt = await this.readBundledPrompt("build/300-focus.md");
		await this.sendUserMessage(prompt);

		prompt = await this.readBundledPrompt("build/301-analyze.md");
		await this.sendUserMessage(prompt);

		this.request?.messages.push({
			role: "user",
			content: "/plan"
		});
		const planWorkflow = PlanWorkflow.create(this.config, this.repository, this.updated);
		await planWorkflow.sendRequest(this.request!);

		this.request?.messages.push({
			role: "user",
			content: "/update"
		});
		const updateWorkflow = UpdateWorkflow.create(this.config, this.repository, this.updated);
		await updateWorkflow.sendRequest(this.request!);
	}
}
