import { Message } from "./Message";

export interface Request {
	model: string;
	id: string;
	messages: Message[];
}