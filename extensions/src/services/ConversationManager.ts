import { Conversation } from "@lvt/aici-library/dist/llm/Conversation";

export class ConversationManager {
	/**
	 * Merge incoming assistant message content into current conversation.
	 * Returns a new Conversation object with updated messages.
	 */
	public static mergeAssistantMessage(currentConvo: Conversation, incoming: Conversation): Conversation {
		const cloned: Conversation = JSON.parse(JSON.stringify(currentConvo));
		const incomingMessages = incoming.messages ?? [];
		const currentMessages = cloned.messages ?? [];

		const incomingLast = incomingMessages.length > 0 ? incomingMessages[incomingMessages.length - 1] : undefined;
		const isAssistant = incomingLast?.role?.toLowerCase() === "assistant";
		const incomingText = (incomingLast?.content || "").trim();

		console.debug("mergeAssistantMessage - Incoming last role:", incomingLast?.role, "content:", incomingText.substring(0,100));

		if (!isAssistant || incomingText.length === 0)
			return cloned;

		const lastCurr = currentMessages.length ? currentMessages[currentMessages.length - 1] : undefined;
		const lastCurrText = (lastCurr?.content || "").trim();
		const lastCurrRole = (lastCurr?.role || "").toLowerCase();

		console.debug("mergeAssistantMessage - Current last role:", lastCurr?.role, "content:", lastCurrText.substring(0,100));

		if (lastCurr && lastCurrRole === "assistant") {
			if (incomingText !== lastCurrText) {
				const replaced = currentMessages.slice(0, currentMessages.length - 1).concat([{ ...incomingLast }]);
				cloned.messages = replaced;
				console.debug("mergeAssistantMessage - replaced last assistant message.");
			} else {
				console.debug("mergeAssistantMessage - incoming assistant message matches current last message, no change.");
			}
		} else {
			if (incomingText !== lastCurrText) {
				cloned.messages = currentMessages.concat([{ ...incomingLast }]);
				console.debug("mergeAssistantMessage - appended assistant message.");
			} else {
				console.debug("mergeAssistantMessage - incoming assistant message same as current last user message, no append.");
			}
		}

		return cloned;
	}

	/**
	 * Return the last user message from the conversation if any.
	 */
	public static getLastUserMessage(conversation: Conversation): { role: string; content: string } | undefined {
		const msgs = conversation?.messages ?? [];
		for (let i = msgs.length - 1; i >= 0; i--) {
			const m = msgs[i];
			if ((m?.role || "").toLowerCase() === "user")
				return m;
		}
		return undefined;
	}

	/**
	 * Extract workflow name from the user message text.
	 */
	public static extractWorkflowName(text: string): string | undefined {
		const lines = (text || "").split(/\r?\n/);
		for (const raw of lines) {
			const line = raw.trim();
			const m = /^\s*\/([a-z][\w\-]*)\s*$/i.exec(line);
			if (m) return (m[1] || "").toLowerCase();
		}
		return undefined;
	}

	/**
	 * Resolve model selection string to used model string.
	 */
	public static resolveModel(selection: string | undefined, defaultModel: string): string {
		if (!selection || selection === "default") return defaultModel || "";
		return selection;
	}
}
