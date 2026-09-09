import type { BachsHttpClient } from "../client.js";
import type { PaginatedResponse, PaginationParams } from "../types/index.js";

export type RefundResponse = {
	refund_id: string;
	charge_id: string;
	reference: string;
	status: "processing" | "success" | "failed";
	requested_amount: string;
	refunded_amount: string | null;
	refund_fee_amount: string;
	fee_bearer: "org" | "customer";
	reason: string | null;
	created_at: string;
	updated_at: string;
	completed_at: string | null;
};

export interface CreateRefundParams {
	charge_id: string;
	reference: string;
	refund_address?: string | null;
	amount?: string | null;
	fee_bearer?: "org" | "customer" | null;
	reason?: string | null;
	idempotency_key?: string | null;
	simulated_outcome?: "success" | "failed" | null;
}

export interface ListRefundsParams extends PaginationParams {
	charge_id?: string;
	status?: string;
}

export class RefundsResource {
	constructor(private client: BachsHttpClient) {}

	public async create(params: CreateRefundParams): Promise<RefundResponse> {
		return this.client.post("/refunds", params);
	}

	public async get(id: string): Promise<RefundResponse> {
		return this.client.get(`/refunds/${id}`);
	}

	public async getByCharge(paymentId: string): Promise<RefundResponse> {
		return this.client.get(`/refunds/by-charge/${paymentId}`);
	}

	public async list(
		params?: ListRefundsParams,
	): Promise<PaginatedResponse<RefundResponse>> {
		return this.client.get("/refunds", params);
	}
}
