import * as vscode from "vscode";
import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";
import { BasePostMessageServer } from "../BasePostMessageServer";
import { AiciConfig } from "@lvt/aici-library/dist/vsce/AiciConfig";
import { Config } from "../../config";

export class PostMessageServer extends BasePostMessageServer {
	private resourceUri: vscode.Uri;
	public constructor(panel: vscode.WebviewPanel, resourceUri: vscode.Uri) {
		super(panel);
		this.resourceUri = resourceUri;
	}

	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};
		ret[PostMessageTypes.SettingsGet] = this.handleSettingsGet.bind(this);
		ret[PostMessageTypes.SettingsSave] = this.handleSettingsSave.bind(this);
		return ret;
	}

	private async handleSettingsGet(_message: PostMessage<null | undefined>): Promise<void> {
		const cfg = await Config.create(this.resourceUri);
		this.send(PostMessageTypes.SettingsLoaded, cfg);
	}

	private async handleSettingsSave(message: PostMessage<AiciConfig>): Promise<void> {
		const cfg = Config.copy(message.payload);
		await cfg.save(this.resourceUri);
	}
}
