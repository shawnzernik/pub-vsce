/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OpenAI SDK backed Connection (import-based)
 *
 * - Uses top-level import OpenAI from "openai".
 * - Uses the provided `url` to compute an SDK base URL so alternate endpoints
 *   (e.g. http://localhost:3000/v1/chat/completions) work.
 *
 * Public API unchanged.
 */

import * as util from "util";
import OpenAI from "openai";
import { Request } from "@lvt/aici-library/dist/llm/Request";
import { Response } from "@lvt/aici-library/dist/llm/Response";
import { Uuid } from "@lvt/aici-library/dist/Uuid";
import type { ConnectionUpdater, Connection as IConnection } from "../Connection";

export interface ConnectionOptions {
	retries?: number; // number of retries
	retryDelaySeconds?: number; // base seconds to wait between retries
	// any SDK specific options may also be included and will be passed through
	[key: string]: any;
}

export class Connection implements IConnection {
	private url: string;
	private key: string;
	private options: any;
	public response: Response;
	public updated: ConnectionUpdater;

	private openai: OpenAI;

	public constructor(url: string, key: string = "", updater: ConnectionUpdater = () => { }, options: ConnectionOptions = {}) {
		this.url = url;
		this.key = key;
		this.options = options;

		this.response = {
			id: "",
			message: {
				content: "",
				role: "assistant",
			},
			metrics: {
				requestTokens: 0,
				responseTokens: 0,
				seconds: 0,
			},
			model: "",
			status: "working",
		};

		this.updated = updater;

		// Derive a base URL suitable for the OpenAI SDK from the provided url.
		// If the provided url includes "/v1" (e.g. ".../v1/chat/completions"), we
		// set baseUrl to everything up through "/v1". Otherwise, we use the origin.
		const baseUrl = Connection.computeBaseUrl(this.url);

		// Initialize OpenAI client. The SDK constructor accepts an options object;
		// cast to any to avoid strict typing differences between SDK versions.
		this.openai = new OpenAI({ apiKey: this.key, baseURL: baseUrl } as any);
	}

	private static computeBaseUrl(urlStr: string): string {
		try {
			// If url contains '/v1' we want base up to '/v1'
			const idx = urlStr.indexOf("/v1");
			if (idx >= 0)
				// include '/v1' in base
				return urlStr.slice(0, idx + 3); // '/v1' length is 3

			// Otherwise return origin (scheme + host + optional port)
			const parsed = new URL(urlStr);
			return parsed.origin;
		} catch {
			// Fallback: return provided string (best-effort)
			return urlStr;
		}
	}

	private static sleep(seconds: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
	}

	private logError(attempt: number, maxAttempts: number, err: unknown): void {
		try {
			console.error(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} failed with error:`, util.inspect(err, { depth: 5 }));
		} catch (err2) {
			console.error(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} failed with error:`, String(err));
		}

		try {
			const anyErr = err as any;
			if (anyErr?.response)
				console.error("[Aici][OpenAI] error.response:", util.inspect(anyErr.response, { depth: 5 }));
			if (anyErr?.body)
				console.error("[Aici][OpenAI] error.body:", util.inspect(anyErr.body, { depth: 5 }));
			if (anyErr?.cause)
				console.error("[Aici][OpenAI] error.cause:", util.inspect(anyErr.cause, { depth: 5 }));
		} catch { }
	}

	public async send(request: Request): Promise<void> {
		this.initializeResponse(request);

		this.updated(this);

		const started = Date.now();

		try {
			await this.sendWithOpenAiSdk(request, started);
		} catch (err) {
			this.response.status = "error";
			this.updated(this);
			throw err;
		}

		this.updated(this);
	}

	private initializeResponse(request: Request): void {
		this.response.id = request.id || Uuid.asString();
		this.response.message = { role: "assistant", content: "", tokenCount: 0 };
		this.response.metrics = { requestTokens: 0, responseTokens: 0, seconds: 0 };
		this.response.model = request.model;
		this.response.status = "working";
	}

	private async sendWithOpenAiSdk(request: Request, started: number): Promise<void> {
		const sdkOptions: any = { ...(this.options || {}) };
		delete sdkOptions.retries;
		delete sdkOptions.retryDelaySeconds;
		delete sdkOptions.responseFormat;

		const baseParams: any = {
			...sdkOptions,
			model: request.model,
			messages: request.messages,
			stream: false,
		};

		// Removed structured output injection.

		if (!this.openai || !this.openai.chat || typeof this.openai.chat.completions?.create !== "function") {
			const errMsg = "OpenAI SDK does not expose chat.completions.create(...). Confirm installed SDK version.";
			console.error("[Aici][OpenAI] " + errMsg);
			throw new Error(errMsg);
		}

		const retriesRaw = Number(this.options?.retries ?? 3);
		const delaySec = Number(this.options?.retryDelaySeconds ?? 10);
		const allowRetries = retriesRaw > 0;
		const maxAttempts = allowRetries ? retriesRaw : 1;

		let lastErr: any = null;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			console.info(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} starting (model=${request.model}).`);

			this.response.message.content = "";
			this.response.message.tokenCount = 0;
			this.response.metrics.responseTokens = 0;
			this.response.metrics.seconds = (Date.now() - started) / 1000;
			this.response.status = "working";
			this.updated(this);

			try {
				const res = await this.openai.chat.completions.create(baseParams);
				const first = Array.isArray(res.choices) && res.choices.length > 0 ? res.choices[0] : null;

				let content = "";
				if (first) {
					if (typeof first.message?.content === "string")
						content = first.message.content;
				}

				const usage: any = (res as any)?.usage || {};
				const promptTokens = Number(usage?.prompt_tokens ?? 0);
				const completionTokens = Number(usage?.completion_tokens ?? 0);

				this.response.message.content = content;
				this.response.message.tokenCount = completionTokens;
				this.response.metrics.requestTokens = promptTokens;
				this.response.metrics.responseTokens = completionTokens;
				this.response.metrics.seconds = (Date.now() - started) / 1000;
				this.response.model = (res as any)?.model || request.model;
				this.response.status = "idle";

				this.updated(this);

				console.info(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} succeeded.`);
				return;
			} catch (err) {
				lastErr = err;
				this.logError(attempt, maxAttempts, err);

				if (attempt < maxAttempts && allowRetries) {
					const waitSec = attempt * delaySec;
					console.info(`[Aici][OpenAI] Waiting ${waitSec}s before retry #${attempt + 1}/${maxAttempts}...`);
					await Connection.sleep(waitSec);
					continue;
				} else {
					console.error(`[Aici][OpenAI] All attempts (${maxAttempts}) exhausted. Propagating last error.`);
					throw lastErr;
				}
			}
		}
	}
}