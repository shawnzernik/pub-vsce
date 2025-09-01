import { PostMessageServer } from "./PostMessageServer";
import { BaseExtension } from "../BaseExtension";

export class HelpExtension extends BaseExtension {
	protected override getVsceCommand(): string {
		return "openHelp";
	}
	protected override getTitle(): string {
		return "Aici Help";
	}
	protected override getWebpackName(): string {
		return "help";
	}
	protected override getPostMessageServer(): PostMessageServer {
		return new PostMessageServer(this.panel!);
	}
}