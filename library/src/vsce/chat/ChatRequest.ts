import { Conversation } from "../../llm/Conversation";
import { Metrics } from "../../llm/Metrics";
import { ResponseStatus } from "../../llm/Response";

/**
 * ChatRequest - canonical request shape sent from webview -> extension.
 *
 * Notes:
 * - conversation is the canonical conversation payload (required).
 * - The previous `messages?: Message[]` fallback has been removed. Clients must
 *   supply `conversation: Conversation`.
 */
export interface ChatRequest {
	// Optional model override (string), e.g. "gpt-4o" or "default"
	model?: string;

	// Preferred canonical conversation payload (required)
	conversation: Conversation;

	// Optional live metrics (sender may include usage intermediary/final info)
	metrics?: Metrics;

	// Optional live status
	status?: ResponseStatus;
}