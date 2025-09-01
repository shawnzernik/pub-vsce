import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import * as vscode from "vscode";

export abstract class BasePostMessageServer {
	private panel: vscode.WebviewPanel;

	public constructor(panel: vscode.WebviewPanel) {
		this.panel = panel;
	}

	protected send<T>(type: string, payload: T) {
		this.panel.webview.postMessage({
			type: type,
			payload: payload
		});
	}

	protected abstract getHandlers(): Dictionary<(pm: PostMessage<any>) => void>;
	/**
	 * Handle an incoming message from the webview.
	 * - Validates basic shape of the message.
	 * - Looks up a handler from getHandlers().
	 * - Invokes the handler and awaits it if it returns a Promise (handlers may be async).
	 * - Catches and logs errors from handler invocation.
	 */
	public async handle(message: any): Promise<void> {
		if (!message || typeof message.type !== "string" || !message.type)
			return;

		const handlers = await this.getHandlers();
		const handler = handlers[message.type];
		if (!handler)
			return;

		try {
			// Call the handler. The handler signature remains (pm) => void,
			// but it may return a Promise; await it if so.
			const maybePromise = handler(message);
			if (maybePromise != null && typeof (maybePromise as any).then === "function") {
				await maybePromise;
			}
		} catch (err) {
			// Log handler errors to aid debugging; do not rethrow to avoid unhandled promise rejections from the webview event loop.
			// This keeps behavior safe and non-breaking for callers.
			console.error("BasePostMessageServer handler error:", err);
		}
	}
}
