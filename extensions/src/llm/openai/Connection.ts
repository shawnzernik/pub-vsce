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
			status: "idle",
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
			if (idx >= 0) {
				// include '/v1' in base
				return urlStr.slice(0, idx + 3); // '/v1' length is 3
			}
			// Otherwise return origin (scheme + host + optional port)
			const parsed = new URL(urlStr);
			return parsed.origin;
		} catch {
			// Fallback: return provided string (best-effort)
			return urlStr;
		}
	}

	private static approxTokensFromText(text: string): number {
		const len = (text || "").length;
		if (!len) return 0;
		return Math.ceil(len / 4);
	}

	private static approxPromptTokens(messages: Request["messages"]): number {
		let total = 0;
		for (const m of messages || []) total += Connection.approxTokensFromText(m.content || "");
		return total;
	}

	private static sleep(seconds: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
	}

	public async send(request: Request): Promise<void> {
		this.initializeResponse(request);

		// approximate prompt tokens early (keeps parity with previous behavior)
		this.response.metrics.requestTokens = Connection.approxPromptTokens(request.messages);
		this.response.status = "streaming";
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
		this.response.message = { role: "assistant", content: "" };
		this.response.metrics = { requestTokens: 0, responseTokens: 0, seconds: 0 };
		this.response.model = request.model;
		this.response.status = "streaming";
	}

	private async sendWithOpenAiSdk(request: Request, started: number): Promise<void> {
		// Build params merging in any options provided at construction time,
		// but filter out connection-only options that are not valid OpenAI params.
		const sdkOptions: any = { ...(this.options || {}) };
		// Remove local-only options so they are not sent to the OpenAI API
		delete sdkOptions.retries;
		delete sdkOptions.retryDelaySeconds;

		const baseParams: any = {
			...sdkOptions,
			model: request.model,
			messages: request.messages,
			stream: true,
		};

		// Ensure SDK exposure we expect exists
		if (!this.openai || !this.openai.chat || typeof this.openai.chat.completions?.create !== "function") {
			const errMsg = "OpenAI SDK does not expose chat.completions.create(...). Confirm installed SDK version.";
			console.error("[Aici][OpenAI] " + errMsg);
			throw new Error(errMsg);
		}

		// Determine retry policy from options (defaults)
		const retriesRaw = Number(this.options?.retries ?? 3);
		const delaySec = Number(this.options?.retryDelaySeconds ?? 10);

		// If retriesRaw <= 0, then we perform exactly one attempt and do not sleep -> no retry logic.
		const allowRetries = (retriesRaw > 0);
		const maxAttempts = allowRetries ? retriesRaw : 1;

		let lastErr: any = null;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			console.info(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} starting (model=${request.model}).`);
			// Reset streaming state for each attempt
			this.response.message.content = "";
			this.response.metrics.responseTokens = 0;
			this.response.metrics.seconds = (Date.now() - started) / 1000;
			this.response.status = "streaming";
			this.updated(this);

			try {
				// Obtain value from SDK and coerce to AsyncIterable<any>.
				const maybe = await this.openai.chat.completions.create(baseParams);
				const stream = maybe as unknown as AsyncIterable<any>;
				if (typeof (stream as any)[Symbol.asyncIterator] !== "function") {
					const nonStreamErr = new Error("OpenAI SDK didn't return a stream-able object from chat.completions.create(params).");
					console.warn("[Aici][OpenAI] non-streamable response received:", util.inspect(maybe, { depth: 3 }));
					throw nonStreamErr;
				}

				// Process stream; if an error occurs here we'll catch it below and possibly retry.
				for await (const part of stream) {
					try {
						// usage object at top-level
						if (part?.usage) {
							this.response.metrics.requestTokens = part.usage.prompt_tokens ?? this.response.metrics.requestTokens;
							this.response.metrics.responseTokens = part.usage.completion_tokens ?? this.response.metrics.responseTokens;
							this.response.metrics.seconds = (Date.now() - started) / 1000;
							this.response.status = "streaming";
							this.updated(this);
							continue;
						}

						const first = (Array.isArray(part?.choices) && part.choices.length > 0) ? part.choices[0] : null;
						const delta = first?.delta ?? {};

						// reasoning_content (stream reasoning visibly during generation)
						if (typeof delta?.reasoning_content === "string" && delta.reasoning_content.length > 0) {
							// Maintain prior behavior: do not expose reasoning markers in final text
							// (this append is intentionally a no-op string so we trigger updates but don't change content)
							this.response.message.content += "";
							this.response.metrics.seconds = (Date.now() - started) / 1000;
							this.response.metrics.responseTokens = Connection.approxTokensFromText(this.response.message.content);
							this.response.status = "streaming";
							this.updated(this);
						}

						// delta.content is typical for streamed assistant text
						if (typeof delta?.content === "string" && delta.content.length > 0) {
							this.response.message.content += delta.content;
							this.response.metrics.seconds = (Date.now() - started) / 1000;
							this.response.metrics.responseTokens = Connection.approxTokensFromText(this.response.message.content);
							this.response.status = "streaming";
							this.updated(this);
						}

						// Some SDK events include a 'finish_reason' marker where finish_reason != null -> completion done.
						if (first?.finish_reason) {
							// finalize
							this.response.message.content = this.response.message.content;
							this.response.metrics.responseTokens = Connection.approxTokensFromText(this.response.message.content);
							this.response.metrics.seconds = (Date.now() - started) / 1000;
							this.response.status = "idle";
							this.updated(this);
							// don't break here because some SDK streams emit final usage afterwards; continue to process events.
						}
					} catch (partErr) {
						// Log parse/part-level errors as debug to help diagnose occasional malformed parts
						console.debug("[Aici][OpenAI] parse/part error while processing stream part:", util.inspect(partErr, { depth: 3 }));
						// ignore parse errors on partial events (keep streaming if possible)
					}
				}

				// Finalize if stream ended without explicit finish_reason
				if (this.response.status === "streaming") {
					this.response.message.content = this.response.message.content;
					this.response.metrics.responseTokens = Connection.approxTokensFromText(this.response.message.content);
					this.response.metrics.seconds = (Date.now() - started) / 1000;
					this.response.status = "idle";
					this.updated(this);
				}

				console.info(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} succeeded.`);
				// success - return
				return;
			} catch (err) {
				lastErr = err;
				// Log the raw error with deep inspection to capture SDK error shapes and nested details
				try {
					console.error(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} failed with error:`, util.inspect(err, { depth: 5 }));
				} catch {
					// Fallback to basic logging if inspect fails
					console.error(`[Aici][OpenAI] Attempt ${attempt}/${maxAttempts} failed with error:`, String(err));
				}

				// Try to log common nested fields if present (helpful for OpenAI error objects)
				try {
					if ((err as any)?.response) {
						console.error("[Aici][OpenAI] error.response:", util.inspect((err as any).response, { depth: 5 }));
					}
					if ((err as any)?.body) {
						console.error("[Aici][OpenAI] error.body:", util.inspect((err as any).body, { depth: 5 }));
					}
					if ((err as any)?.cause) {
						console.error("[Aici][OpenAI] error.cause:", util.inspect((err as any).cause, { depth: 5 }));
					}
				} catch { /* best-effort logging; ignore inspect failures */ }

				// If not last attempt, wait an incremental delay and retry
				if (attempt < maxAttempts && allowRetries) {
					const waitSec = attempt * delaySec;
					console.info(`[Aici][OpenAI] Waiting ${waitSec}s before retry #${attempt + 1}/${maxAttempts}...`);
					await Connection.sleep(waitSec);
					continue;
				} else {
					// last attempt -> propagate error
					console.error(`[Aici][OpenAI] All attempts (${maxAttempts}) exhausted. Propagating last error.`);
					throw lastErr;
				}
			}
		}
	}
}
