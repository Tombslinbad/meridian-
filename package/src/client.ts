import { BachsError, type BachsValidationError } from "./errors.js";
import type { BachsClientOptions } from "./types/index.js";

export class BachsHttpClient {
	private apiKey: string;
	private baseUrl: string;
	private fetch: typeof fetch;

	constructor(options: BachsClientOptions) {
		if (!options.apiKey) {
			throw new Error("Bachs API key is required");
		}
		this.apiKey = options.apiKey;

		if (options.baseUrl) {
			this.baseUrl = options.baseUrl;
		} else {
			this.baseUrl = this.apiKey.startsWith("sk_sandbox_")
				? "https://sandbox-api.bachs.io/v1"
				: "https://api.bachs.io/v1";
		}

		this.fetch = options.fetch || globalThis.fetch;
		if (!this.fetch) {
			throw new Error(
				"Fetch API is missing. Please upgrade to Node 18+ or provide a custom fetch implementation.",
			);
		}
	}

	public async request<T>(
		method: string,
		path: string,
		body?: unknown,
		query?: unknown,
	): Promise<T> {
		const url = new URL(`${this.baseUrl}${path}`);

		if (query && typeof query === "object") {
			Object.entries(query as Record<string, unknown>).forEach(
				([key, value]) => {
					if (value !== undefined && value !== null) {
						if (Array.isArray(value)) {
							value.forEach((item) => {
								url.searchParams.append(key, String(item));
							});
						} else {
							url.searchParams.append(key, String(value));
						}
					}
				},
			);
		}

		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.apiKey}`,
			Accept: "application/json",
		};

		let requestBody: BodyInit | undefined;
		if (body) {
			if (typeof FormData !== "undefined" && body instanceof FormData) {
				requestBody = body;
				// Don't set Content-Type header; fetch will automatically set it to multipart/form-data with boundary
			} else {
				headers["Content-Type"] = "application/json";
				requestBody = JSON.stringify(body);
			}
		}

		const response = await this.fetch(url.toString(), {
			method,
			headers,
			body: requestBody,
		});

		if (!response.ok) {
			const text = await response.text();
			let errorData: {
				detail?: string;
				error_code?: string;
				errors?: BachsValidationError[];
			};

			try {
				errorData = JSON.parse(text);
			} catch (_err: unknown) {
				throw new BachsError(
					`HTTP Error ${response.status}: ${response.statusText} - ${text}`,
					response.status,
				);
			}

			throw new BachsError(
				errorData.detail || response.statusText,
				response.status,
				errorData.error_code,
				errorData.errors,
			);
		}

		// Handle empty responses (like 204 No Content)
		if (response.status === 204) {
			return {} as T;
		}

		return (await response.json()) as T;
	}

	public get<T>(path: string, query?: unknown): Promise<T> {
		return this.request<T>("GET", path, undefined, query);
	}

	public post<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	public patch<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("PATCH", path, body);
	}

	public delete<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("DELETE", path, body);
	}
}
