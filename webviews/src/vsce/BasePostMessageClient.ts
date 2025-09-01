import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";

declare function acquireVsCodeApi(): any;

export abstract class BasePostMessageClient {
	protected vscode: any = acquireVsCodeApi();

	public constructor() {
		window.addEventListener("message", this.onMessageEvent.bind(this));
	}

	public send<T>(type: string, payload: T): void {
		this.vscode.postMessage({ type, payload });
	}

	protected abstract getHandlers(): Dictionary<(pm: PostMessage<any>) => void>;
	private async onMessageEvent(event: MessageEvent<any>): Promise<void> {
		const message = event.data;

		if (!message || typeof message.type !== "string" || !message.type)
			return;

		const handlers = this.getHandlers();
		if (!handlers[message.type])
			return;

		await handlers[message.type]!(message);
	}
}
