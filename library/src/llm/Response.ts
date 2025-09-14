import { Message } from "./Message";
import { Metrics } from "./Metrics";

export type ResponseStatus = "idle" | "working" | "error";

export interface Response {
	model: string;
	id: string;
	message: Message;
	metrics: Metrics;
	status: ResponseStatus;
}