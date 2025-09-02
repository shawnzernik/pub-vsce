import * as vscode from "vscode";
import * as json5 from "json5";
import { AiciConfig } from "@lvt/aici-library/dist/vsce/AiciConfig";
import { Repository } from "./system/Repository";

export class Config implements AiciConfig {
	private static readonly aiKeySecretId = "aici.aiKey";
	private static secretStorage: vscode.SecretStorage | undefined;

	public static async setSecretStorage(context: vscode.ExtensionContext): Promise<void> {
		Config.secretStorage = context.secrets;
	}

	public aiApi: string;
	public aiUrl: string;
	public aiKey: string;
	public aiModel: string;
	public ignoreRegex: string[];
	public aiModels: string[];

	// Retry settings
	public aiRetries: number;
	public aiRetryDelaySeconds: number;

	// Update workflow command execution retries
	public updateRetries: number;

	// Token length divisor for approximate token counting
	public tokenLengthDivisor: number;

	private constructor() {
		this.aiApi = "";
		this.aiUrl = "";
		this.aiKey = "";
		this.aiModel = "";
		this.ignoreRegex = [];
		this.aiModels = [];
		this.aiRetries = 3;
		this.aiRetryDelaySeconds = 10;
		this.updateRetries = 3;
		this.tokenLengthDivisor = 3.5;
	}

	public static copy(original: AiciConfig): Config {
		const ret = new Config();
		ret.aiKey = original.aiKey;

		ret.aiApi = original.aiApi;
		ret.aiModel = original.aiModel;
		ret.aiModels = original.aiModels;
		ret.aiUrl = original.aiUrl;
		ret.ignoreRegex = original.ignoreRegex;

		ret.aiRetries = (original as any).aiRetries ?? 3;
		ret.aiRetryDelaySeconds = (original as any).aiRetryDelaySeconds ?? 10;
		ret.updateRetries = (original as any).updateRetries ?? 3;
		ret.tokenLengthDivisor = (original as any).tokenLengthDivisor ?? 3.5;

		return ret;
	}

	public static async create(resource: vscode.Uri): Promise<Config> {
		Config.ensureSecretStorage();

		const vsceConfig = vscode.workspace.getConfiguration("aici", resource);
		const ret = new Config();

		ret.aiKey = (await Config.secretStorage!.get(Config.aiKeySecretId)) || "";

		ret.aiApi = vsceConfig.get<string>("aiApi", "") || "";
		ret.aiModel = vsceConfig.get<string>("aiModel", "") || "";
		ret.aiModels = vsceConfig.get<string[]>("aiModels", []) || [];
		ret.aiUrl = vsceConfig.get<string>("aiUrl", "") || "";
		ret.ignoreRegex = vsceConfig.get<string[]>("ignoreRegex", []) || [];

		ret.aiRetries = vsceConfig.get<number>("aiRetries", 3) ?? 3;
		ret.aiRetryDelaySeconds = vsceConfig.get<number>("aiRetryDelaySeconds", 10) ?? 10;

		ret.updateRetries = vsceConfig.get<number>("updateRetries", 3) ?? 3;
		ret.tokenLengthDivisor = vsceConfig.get<number>("tokenLengthDivisor", 3.5) ?? 3.5;

		return ret;
	}

	public async save(resource: vscode.Uri): Promise<void> {
		const repo = await Repository.instance(resource);
		const settings = this.readSettings(repo);

		settings["aici.aiApi"] = this.aiApi;
		settings["aici.aiModel"] = this.aiModel;
		settings["aici.aiModels"] = this.aiModels;
		settings["aici.aiUrl"] = this.aiUrl;
		settings["aici.ignoreRegex"] = this.ignoreRegex;
		settings["aici.aiRetries"] = this.aiRetries;
		settings["aici.aiRetryDelaySeconds"] = this.aiRetryDelaySeconds;
		settings["aici.updateRetries"] = this.updateRetries;
		settings["aici.tokenLengthDivisor"] = this.tokenLengthDivisor;

		repo.write(".vscode/settings.json", JSON.stringify(settings, null, "\t"));

		await Config.secretStorage?.store(Config.aiKeySecretId, this.aiKey);
	}

	private static ensureSecretStorage(): void {
		if (!Config.secretStorage)
			throw new Error("You must call Config.setSecretStorage(context: vscode.ExtensionContext) first!");
	}

	private readSettings(repo: Repository): any {
		const settingJson = repo.read(".vscode/settings.json");
		return json5.parse(settingJson);
	}
}