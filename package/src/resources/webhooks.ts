import type { BachsHttpClient } from "../client.js";
import { BachsSignatureVerificationError } from "../errors.js";
import type { PaginatedResponse, PaginationParams } from "../types/index.js";
import type {
	BachsWebhookEvent,
	CreateWebhookEndpointParams,
	UpdateWebhookEndpointParams,
	WebhookDeliveryMetrics,
	WebhookEndpoint,
	WebhookEventDetail,
	WebhookEventSummary,
	WebhookHeaders,
} from "../types/webhooks.js";

// Helper to convert hex string to Uint8Array safely for constant-time comparison
function hexToUint8Array(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) {
		throw new Error("Invalid hex string");
	}
	const array = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		array[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
	}
	return array;
}

// Fallback constant-time comparison if crypto.subtle isn't fully available
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i];
	}
	return result === 0;
}

export interface ConstructEventOptions {
	/** The raw payload before any JSON parsing */
	payload: string | ArrayBuffer | Uint8Array;
	/** The secret used to sign the webhook */
	secret: string;
	/** Pass the entire headers object, and we will extract the signature and timestamp automatically */
	headers?: WebhookHeaders;
	/** Explicitly pass the signature header (X-Bachs-Signature) if not passing the full headers object */
	signatureHeader?: string;
	/** Explicitly pass the timestamp header (X-Bachs-Timestamp) if not passing the full headers object */
	timestampHeader?: string | number;
	/** Time tolerance in seconds before rejecting stale events (defaults to 300) */
	toleranceSeconds?: number;
}

export class WebhooksResource {
	constructor(private client: BachsHttpClient) { }

	/**
	 * Verify a webhook payload and signature using isomorphic Web Crypto API.
	 * Returns the typed BachsEvent if successful, throws BachsSignatureVerificationError if invalid.
	 */
	public async constructEvent(
		options: ConstructEventOptions,
	): Promise<BachsWebhookEvent> {
		const { payload, secret, headers, toleranceSeconds = 300 } = options;

		let signatureHeader = options.signatureHeader || "";
		let timestampHeader = options.timestampHeader?.toString() || "";

		if (!signatureHeader || !timestampHeader) {
			if (headers && typeof (headers as any).get === "function") {
				const get = (headers as any).get.bind(headers);
				signatureHeader =
					signatureHeader ||
					get("x-bachs-signature") ||
					get("X-Bachs-Signature") ||
					"";
				timestampHeader =
					timestampHeader ||
					get("x-bachs-timestamp") ||
					get("X-Bachs-Timestamp") ||
					"";
			} else if (headers) {
				const h = headers as Record<string, string | string[] | undefined>;
				const getHeader = (key: string) => {
					const val = h[key] || h[key.toLowerCase()];
					return Array.isArray(val) ? val[0] : val;
				};
				signatureHeader =
					signatureHeader || getHeader("X-Bachs-Signature") || "";
				timestampHeader =
					timestampHeader || getHeader("X-Bachs-Timestamp") || "";
			}
		}

		if (!signatureHeader || !timestampHeader || !secret) {
			throw new BachsSignatureVerificationError(
				"Missing required signature parameters or secret. Ensure X-Bachs-Signature and X-Bachs-Timestamp headers are present.",
				signatureHeader,
			);
		}

		// Convert payload to string if necessary
		let rawBody: string;
		if (typeof payload === "string") {
			rawBody = payload;
		} else if (
			payload instanceof Uint8Array ||
			payload instanceof ArrayBuffer
		) {
			rawBody = new TextDecoder().decode(payload);
		} else {
			throw new BachsSignatureVerificationError(
				"Payload must be a string, Uint8Array, or ArrayBuffer. Ensure you are passing the raw request body before JSON parsing.",
			);
		}

		const timestamp = Number.parseInt(timestampHeader, 10);
		if (Number.isNaN(timestamp)) {
			throw new BachsSignatureVerificationError(
				"Invalid timestamp header format.",
				signatureHeader,
			);
		}

		// Reject stale deliveries
		const currentTimestamp = Math.floor(Date.now() / 1000);
		if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
			throw new BachsSignatureVerificationError(
				"Timestamp outside the tolerance zone.",
				signatureHeader,
				rawBody,
			);
		}

		const message = `${timestamp}.${rawBody}`;
		const encoder = new TextEncoder();

		let expectedSignatureArray: Uint8Array;

		try {
			if (globalThis?.crypto?.subtle) {
				// Import the HMAC key
				const key = await globalThis.crypto.subtle.importKey(
					"raw",
					encoder.encode(secret),
					{ name: "HMAC", hash: "SHA-256" },
					false,
					["sign"],
				);

				// Compute the signature
				const signatureBuffer = await globalThis.crypto.subtle.sign(
					"HMAC",
					key,
					encoder.encode(message),
				);
				expectedSignatureArray = new Uint8Array(signatureBuffer);
			} else {
				// biome-ignore lint/suspicious/noExplicitAny: Fallback to Node.js crypto
				let nodeCrypto: any;
				try {
					nodeCrypto = await import("node:crypto");
				} catch (_e: unknown) {
					throw new Error(
						"Web Crypto API (globalThis.crypto.subtle) is not available, and falling back to Node.js 'crypto' module failed. Ensure you are in a supported environment.",
					);
				}
				const hmac = nodeCrypto.createHmac("sha256", secret);
				hmac.update(message);
				expectedSignatureArray = new Uint8Array(hmac.digest());
			}

			// Compare against the provided header signature (hex string)
			let providedSignatureArray: Uint8Array;
			try {
				providedSignatureArray = hexToUint8Array(signatureHeader);
			} catch {
				throw new BachsSignatureVerificationError(
					"Signature header is not a valid hex string.",
					signatureHeader,
				);
			}

			if (!timingSafeEqual(expectedSignatureArray, providedSignatureArray)) {
				throw new BachsSignatureVerificationError(
					"No signatures found matching the expected signature for payload.",
					signatureHeader,
					rawBody,
				);
			}
		} catch (error) {
			if (error instanceof BachsSignatureVerificationError) {
				throw error;
			}
			throw new BachsSignatureVerificationError(
				`Failed to verify signature: ${error instanceof Error ? error.message : "Unknown error"}`,
				signatureHeader,
			);
		}

		try {
			return JSON.parse(rawBody) as BachsWebhookEvent;
		} catch {
			throw new BachsSignatureVerificationError(
				"Failed to parse payload as JSON after signature verification.",
				signatureHeader,
				rawBody,
			);
		}
	}

	// Webhook Endpoints Management API

	public async createEndpoint(
		params: CreateWebhookEndpointParams,
	): Promise<WebhookEndpoint & { signing_secret: string }> {
		return this.client.post("/webhooks/endpoints", params);
	}

	public async getEndpoint(id: string): Promise<WebhookEndpoint> {
		return this.client.get(`/webhooks/endpoints/${id}`);
	}

	public async listEndpoints(
		params?: PaginationParams,
	): Promise<WebhookEndpoint[]> {
		return this.client.get("/webhooks/endpoints", params);
	}

	public async updateEndpoint(
		id: string,
		params: UpdateWebhookEndpointParams,
	): Promise<WebhookEndpoint> {
		return this.client.patch(`/webhooks/endpoints/${id}`, params);
	}

	public async deleteEndpoint(id: string): Promise<{
		status: "deleted";
		endpoint_id: string;
	}> {
		return this.client.delete(`/webhooks/endpoints/${id}`);
	}

	public async rotateSecret(id: string): Promise<WebhookEndpoint> {
		return this.client.post(`/webhooks/endpoints/${id}/rotate-secret`);
	}

	/**
	 * Retrieve delivery metrics for an endpoint
	 * Requires the `webhooks:read` scope.
	 */
	public async getEndpointMetrics(
		endpointId: string,
	): Promise<WebhookDeliveryMetrics> {
		return this.client.get(`/webhooks/endpoints/${endpointId}/metrics`);
	}

	/**
	 * List all events for a specific endpoint
	 * Requires the `webhooks:read` scope.
	 */
	public async listEndpointEvents(
		endpointId: string,
		params: PaginationParams = {},
	): Promise<PaginatedResponse<WebhookEventSummary>> {
		return this.client.get(`/webhooks/endpoints/${endpointId}/events`, params);
	}

	/**
	 * Retrieve a specific attempt for a specific endpoint and event
	 * Requires the `webhooks:read` scope.
	 */
	public async retrieveEndpointEvent(params: {
		endpointId: string;
		eventId: string;
	}): Promise<WebhookEventDetail> {
		return this.client.get(
			`/webhooks/endpoints/${params.endpointId}/events/${params.eventId}`,
		);
	}

	public async resendEvent(params: {
		endpointId: string;
		eventId: string;
	}): Promise<{
		status: string;
		attempt_id: string;
	}> {
		return this.client.post(
			`/webhooks/endpoints/${params.endpointId}/events/${params.eventId}/resend`,
		);
	}

	// Webhook Events API

	public async listEvents(
		params?: PaginationParams,
	): Promise<PaginatedResponse<WebhookEventSummary>> {
		return this.client.get(`/webhooks/events`, params);
	}

	public async retrieveEvent(id: string): Promise<WebhookEventDetail> {
		return this.client.get(`/webhooks/events/${id}`);
	}

	public async replayEvent(eventId: string): Promise<{
		event_id: string;
		attempt_id: string;
		attempt_no: number;
		event_type: string;
	}> {
		return this.client.post("/webhooks/replay", { event_id: eventId });
	}
}
