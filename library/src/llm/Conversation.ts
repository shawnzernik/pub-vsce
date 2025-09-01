import { Message } from "./Message";

export interface Conversation {
	dated: string;
	title: string;
	messages: Message[];
}
