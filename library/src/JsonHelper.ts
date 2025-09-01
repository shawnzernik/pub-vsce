export class JsonHelper {
	public static copy<T>(original: any): T {
		return JSON.parse(JSON.stringify(original)) as T;
	}
}