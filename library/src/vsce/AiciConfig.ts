export interface AiciConfig {
	aiApi: string;
	aiUrl: string;
	aiModel: string;
	aiModels: string[];
	ignoreRegex: string[];
	aiKey: string;

	aiRetries: number;
	aiRetryDelaySeconds: number;

	updateRetries: number;

	buildBuildRetries: number;
}
