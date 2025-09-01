import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";
import { BasePostMessageClient } from "../BasePostMessageClient";
import { SettingsWebview } from "./SettingsWebview";
import { AiciConfig } from "@lvt/aici-library/dist/vsce/AiciConfig";

export class PostMessageClient extends BasePostMessageClient {
	private webview: SettingsWebview;

	public constructor(webview: SettingsWebview) {
		super();
		this.webview = webview;
	}

	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};
		ret[PostMessageTypes.SettingsLoaded] = this.onSettingsLoaded.bind(this);
		return ret;
	}

	public requestSettings(): void {
		this.send(PostMessageTypes.SettingsGet, null);
	}

	public saveSettings(config: AiciConfig): void {
		this.send(PostMessageTypes.SettingsSave, config);
	}

	private onSettingsLoaded(message: PostMessage<AiciConfig>): void {
		const cfg = message.payload || {
			aiApi: "",
			aiUrl: "",
			aiModel: "",
			aiModels: [],
			ignoreRegex: [],
			aiKey: ""
		};

		this.webview.setState({
			config: cfg,
			aiModelsText: (cfg.aiModels || []).join("\n"),
			ignoreRegexText: (cfg.ignoreRegex || []).join("\n"),
		});
	}
}
