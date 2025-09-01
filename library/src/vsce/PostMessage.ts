export interface PostMessage<T> {
	type: string;
	payload: T;
}