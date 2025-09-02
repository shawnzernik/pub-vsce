import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { WorkflowBase, WorkflowUpdater } from "./WorkflowBase";
import { UpdateWorkflow } from "./UpdateWorkflow";
import { CommitWorkflow } from "./CommitWorkflow";
import { Repository } from "../../system/Repository";
import { Config } from "../../config";

export class WorkflowFactory {
	private static workflows: Dictionary<(config: Config, repository: Repository, updater: WorkflowUpdater) => WorkflowBase> = {
		update: UpdateWorkflow.create,
		commit: CommitWorkflow.create
	}

	public static create(config: Config, repository: Repository, name: string, updater: WorkflowUpdater): WorkflowBase {
		if (this.workflows[name])
			return this.workflows[name](config, repository, updater);

		throw new Error(`Unknown workflow: ${name}!`);
	}
}