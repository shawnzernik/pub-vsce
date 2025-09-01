import { Request } from "@lvt/aici-library/dist/llm/Request";
import { Repository } from "../../system/Repository";
import { Metrics } from "@lvt/aici-library/dist/llm/Metrics";
import { Config } from "../../config";
import { JsonHelper } from "@lvt/aici-library/dist/JsonHelper";
import { Message } from "@lvt/aici-library/dist/llm/Message";
import { ResponseStatus } from "@lvt/aici-library/dist/llm/Response";

export type WorkflowUpdater = (me: WorkflowBase) => void;

export abstract class WorkflowBase {
	public updated: WorkflowUpdater;
	protected repository: Repository;
	protected config: Config;
	public metrics: Metrics;
	public status: ResponseStatus;
	public request: Request | undefined;

	public constructor(config: Config, repository: Repository, updater: WorkflowUpdater) {
		this.status = "idle";
		this.repository = repository;
		this.updated = updater;
		this.config = config;
		this.metrics = {
			requestTokens: 0,
			responseTokens: 0,
			seconds: 0
		};
	}

	private started = Date.now();
	public async send(request: Request): Promise<Request> {
		this.request = JsonHelper.copy<Request>(request);;
		this.started = Date.now();
		this.status = "streaming";

		// the last message should be the "/workflow"
		// remove this as it will be replaced by the workflows user / assistant combinations
		const tempMessages: Message[] = [];
		for (let cnt = 0; cnt < this.request.messages.length - 1; cnt++)
			tempMessages.push(this.request.messages[cnt]!);
		this.request.messages = tempMessages;
		this.updated(this);

		this.request = await this.execute(this.request);
		return this.request;
	}

	protected abstract execute(request: Request): Promise<Request>;
	protected updateMetrics(metrics: Partial<Metrics>) {
		this.metrics.requestTokens += metrics.requestTokens!;
		this.metrics.responseTokens += metrics.responseTokens!;
		this.metrics.seconds = (Date.now() - this.started) / 1000;
	}
}
