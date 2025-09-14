import { WorkflowBase } from "./WorkflowBase";
import { Repository } from "../../system/Repository";
import { Config } from "../../config";

export class PlanWorkflow extends WorkflowBase {
	public static create(
		config: Config,
		repository: Repository,
		updater: (me: WorkflowBase) => void = () => { }
	): PlanWorkflow {
		return new PlanWorkflow(config, repository, updater);
	}

	protected override async execute(): Promise<void> {
		if (!this.request) throw new Error("Request not initialized");

		const prompt = await this.readBundledPrompt("plan/001-plan.md");
		await this.sendUserMessage(prompt);
	}
}
