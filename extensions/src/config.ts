import * as vscode from "vscode";
import * as json5 from "json5";
import { Repository } from "./system/Repository";

export interface AiciConfig {
	aiApi: string;
	aiUrl: string;
	aiModel: string;
	aiRetries: number;
	aiRetryDelaySeconds: number;
	updateRetries: number;
	buildBuildRetries: number;
	aiKey: string;
	aiModels: string[];
	ignoreRegex: string[];
}

export class Config implements AiciConfig {
	aiApi: string;
	aiUrl: string;
	aiModel: string;
	aiRetries: number;
	aiRetryDelaySeconds: number;
	updateRetries: number;
	buildBuildRetries: number;
	aiKey: string;
	aiModels: string[];
	ignoreRegex: string[];

	private static secretStorage: vscode.SecretStorage | undefined;

	public static async setSecretStorage(context: vscode.ExtensionContext) {
		Config.secretStorage = context.secrets;
	}

	private constructor() {
		this.aiApi = "";
		this.aiUrl = "";
		this.aiModel = "gpt-4";
		this.aiRetries = 3;
		this.aiRetryDelaySeconds = 10;
		this.updateRetries = 3;
		this.buildBuildRetries = 5;
		this.aiKey = "";
		this.aiModels = [];
		this.ignoreRegex = [];
	}

	public static async create(uri: vscode.Uri): Promise<Config> {
		const config = new Config();

		try {
			const repo = await Repository.instance(uri);
			const settingsRaw = repo.read(".vscode/settings.json");
			const settings = json5.parse(settingsRaw);

			config.aiApi = settings["aici.aiApi"] ?? "";
			config.aiUrl = settings["aici.aiUrl"] ?? "";
			config.aiModel = settings["aici.aiModel"] ?? "gpt-4";
			config.aiRetries = Number(settings["aici.aiRetries"] ?? 3);
			config.aiRetryDelaySeconds = Number(settings["aici.aiRetryDelaySeconds"] ?? 10);
			config.updateRetries = Number(settings["aici.updateRetries"] ?? 3);
			config.buildBuildRetries = Number(settings["aici.buildBuildRetries"] ?? 5);

			if (Array.isArray(settings["aici.ignoreRegex"]))
				config.ignoreRegex = settings["aici.ignoreRegex"].map((r: any) => String(r));

			if (Array.isArray(settings["aici.aiModels"]))
				config.aiModels = settings["aici.aiModels"].map((r: any) => String(r));
		} catch {
			// ignore if settings.json missing or invalid
		}

		// Load secret aiKey from SecretStorage or environment
		if (Config.secretStorage) {
			config.aiKey = await Config.secretStorage.get("aici.aiKey") ?? "";
		}

		if (!config.aiKey) {
			config.aiKey =
				process.env["AICI_AIKEY"] ??
				process.env["OPENAI_API_KEY"] ??
				"";
		}

		return config;
	}

	public static copy(original: AiciConfig): Config {
		const ret = new Config();
		ret.aiApi = (original as any).aiApi ?? "";
		ret.aiUrl = (original as any).aiUrl ?? "";
		ret.aiModel = (original as any).aiModel ?? "gpt-4";
		ret.aiRetries = (original as any).aiRetries ?? 3;
		ret.aiRetryDelaySeconds = (original as any).aiRetryDelaySeconds ?? 10;
		ret.updateRetries = (original as any).updateRetries ?? 3;
		ret.buildBuildRetries = (original as any).buildBuildRetries ?? 5;
		ret.aiKey = (original as any).aiKey ?? "";
		ret.aiModels = (original as any).aiModels ?? [];
		ret.ignoreRegex = (original as any).ignoreRegex ?? [];

		return ret;
	}

	public async save(uri: vscode.Uri): Promise<void> {
		if (!Config.secretStorage) throw new Error("SecretStorage not initialized");

		const repo = await Repository.instance(uri);
		const settingsRaw = repo.read(".vscode/settings.json");
		let settings: any = {};
		try {
			settings = json5.parse(settingsRaw);
		} catch {
			settings = {};
		}

		settings["aici.aiApi"] = this.aiApi;
		settings["aici.aiUrl"] = this.aiUrl;
		settings["aici.aiModel"] = this.aiModel;
		settings["aici.aiRetries"] = this.aiRetries;
		settings["aici.aiRetryDelaySeconds"] = this.aiRetryDelaySeconds;
		settings["aici.updateRetries"] = this.updateRetries;
		settings["aici.buildBuildRetries"] = this.buildBuildRetries;
		settings["aici.ignoreRegex"] = this.ignoreRegex;
		settings["aici.aiModels"] = this.aiModels;

		repo.write(".vscode/settings.json", JSON.stringify(settings, null, "\t"));

		await Config.secretStorage.store("aici.aiKey", this.aiKey);
	}
}