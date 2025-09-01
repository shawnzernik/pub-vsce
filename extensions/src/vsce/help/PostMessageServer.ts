import { Dictionary } from "@lvt/aici-library/dist/Dictionary";
import { PostMessage } from "@lvt/aici-library/dist/vsce/PostMessage";
import { BasePostMessageServer } from "../BasePostMessageServer";

export class PostMessageServer extends BasePostMessageServer {
	protected override getHandlers(): Dictionary<(pm: PostMessage<any>) => void> {
		const ret: Dictionary<(pm: PostMessage<any>) => void> = {};

		ret["hello"] = this.handleHello.bind(this);

		return ret;
	}

	private handleHello(_message: PostMessage<any>) {
		return this.send("hello", "Hello World!");
	}
}