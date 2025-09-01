import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { HelpWebview } from "./HelpWebview";
import { BasePostMessageClient } from "../BasePostMessageClient";
import { PostMessageTypes } from "@lvt/aici-library/dist/vsce/PostMessageTypes";


export class PostMessageClient extends BasePostMessageClient {
	private webview: HelpWebview;

	public constructor(webview: HelpWebview) {
		super();
		this.webview = webview;
	}

	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};

		ret[PostMessageTypes.Hello] = this.onHello.bind(this);

		return ret;
	}

	private onHello(postMessage: PostMessage<string>) {
		this.webview.setState({
			response: postMessage.payload
		});
	}
}