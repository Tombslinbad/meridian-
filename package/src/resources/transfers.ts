import type { BachsHttpClient } from "../client.js";
import type { PaginatedResponse, PaginationParams } from "../types/index.js";

export type TransferResponse = {
	id: string;
	source: string;
	destination: string;
	amount: string;
	currency: string;
	status: "pending" | "paid";
	description: string | null;
	metadata: Record<string, unknown>;
	transfer_group: string | null;
	created_at: string;
};

export interface CreateTransferParams {
	destination: string;
	amount: string;
	currency: string;
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	transfer_group?: string | null;
}

export interface ListTransfersParams extends PaginationParams {
	destination?: string;
}

export class TransfersResource {
	constructor(private client: BachsHttpClient) {}

	public async create(params: CreateTransferParams): Promise<TransferResponse> {
		return this.client.post("/transfers", params);
	}

	public async get(id: string): Promise<TransferResponse> {
		return this.client.get(`/transfers/${id}`);
	}

	public async list(
		params?: ListTransfersParams,
	): Promise<PaginatedResponse<TransferResponse>> {
		return this.client.get("/transfers", params);
	}
}
