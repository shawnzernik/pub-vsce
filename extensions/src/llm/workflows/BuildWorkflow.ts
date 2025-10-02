import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { Config } from "../../config";
import { NoninteractiveShell } from "../../system/NoninteractiveShell";
import { UpdateWorkflow } from "./UpdateWorkflow";
import { PlanWorkflow } from "./PlanWorkflow";
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
		const maxNoProgressIterations = this.config.buildBuildRetries ?? 5;
		let consecutiveNoProgressCount = 0;
		let lastErrors: string[] = [];

		for (let attemptIndex = 1; ; attemptIndex++) {
			const cleanErrors = await this.runCmd(cliCommands.clean);
			if (cleanErrors.length !== 0) {
				throw new Error("Clean resulted in errors!");
			}

			const buildErrors = await this.runCmd(cliCommands.build);
			if (buildErrors.length === 0) {
				return;
			}

			if (lastErrors.length === buildErrors.length) {
				const promptNudge = await this.readBundledPrompt("build/402-build-nudge.md");
				await this.sendUserMessage(promptNudge);

				consecutiveNoProgressCount++;
				if (consecutiveNoProgressCount >= maxNoProgressIterations) {
					throw new Error(`Build failed with no progress after ${maxNoProgressIterations} retries.`);
				}
			} else {
				consecutiveNoProgressCount = 0;
			}

			lastErrors = buildErrors;

			await this.fixErrors();
		}
	}

	private async getCliCommands(): Promise<CliCommands> {
		let prompt = "";

		for (let attemptIndex = 1; attemptIndex <= 2; attemptIndex++) {
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
				if (attemptIndex === 2) {
					throw err;
				}

				const fixPromptTemplate = await this.readBundledPrompt("build/900-self-correct.md");
				const fixPrompt = fixPromptTemplate.replace(/{{text}}/g, response);
				await this.sendUserMessage(fixPrompt);
			}
		}

		throw new Error("Failed to parse CLI commands from LLM response");
	}

	private async runCmd(command: string): Promise<string[]> {
		const nis = await NoninteractiveShell.execute(command, { cwd: this.repository.root });

		const systemPrompt = await this.readBundledPrompt("000-system.md");
		const messages = [{ role: "system", content: systemPrompt }];

		let detectPrompt = await this.readBundledPrompt("build/200-error-detect.md");
		detectPrompt = detectPrompt.replace(/{{output}}/g, nis.output);

		let assistantContent = await this.sendOutOfBandRequest(detectPrompt, messages);

		try {
			const parsed = JSON.parse(assistantContent);
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				Array.isArray(parsed.errors) &&
				parsed.errors.every((errorEntry: any) => typeof errorEntry === "string")
			) {
				return parsed.errors;
			}

			throw new Error("Expected object with 'errors' array of strings");
		} catch {
			let fixPrompt = await this.readBundledPrompt("build/900-self-correct.md");
			fixPrompt = fixPrompt.replace(/{{text}}/g, assistantContent);
			assistantContent = await this.sendOutOfBandRequest(fixPrompt, messages);
			try {
				const fixed = JSON.parse(assistantContent);
				if (
					typeof fixed === "object" &&
					fixed !== null &&
					Array.isArray(fixed.errors) &&
					fixed.errors.every((errorEntry: any) => typeof errorEntry === "string")
				) {
					return fixed.errors;
				}
			} catch {
				throw new Error("Could not resolve formatting errors: " + JSON.stringify(messages, null, "\t"));
			}
		}

		throw new Error("Did not parse JSON error messages!");
	}

	private async fixErrors(): Promise<void> {
		const focusPrompt = await this.readBundledPrompt("build/300-focus.md");
		await this.sendUserMessage(focusPrompt);

		const analyzePrompt = await this.readBundledPrompt("build/301-analyze.md");
		await this.sendUserMessage(analyzePrompt);

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
