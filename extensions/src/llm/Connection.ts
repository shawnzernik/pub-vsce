import { Response } from "@lvt/aici-library/dist/llm/Response";
import { Request } from "@lvt/aici-library/dist/llm/Request";

export type ConnectionUpdater = (me: Connection) => void;

export interface Connection {
	response: Response;
	updated: ConnectionUpdater;
	send(request: Request): Promise<void>;
}