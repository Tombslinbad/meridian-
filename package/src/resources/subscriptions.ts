import type { BachsHttpClient } from "../client.js";
import type {
	Customer,
	PaginatedResponse,
	PaginationParams,
	Price,
	Product,
	SubscriptionCadence,
} from "../types/index.js";

export type SubscriptionItem = {
	id: string;
	product: Product;
	price: Price;
	quantity: number;
	created_at: string;
	updated_at: string;
};

export type SubscriptionResponse = {
	id: string;
	customer: Customer;
	payment_method_id: string | null;
	status: "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "paused";
	collection_method: string;
	currency: string;
	amount: string;
	billing_cycle: SubscriptionCadence;
	quantity: number;
	current_period_start: string;
	current_period_end: string;
	previously_billed_at: string | null;
	next_billed_at: string | null;
	trial_end: string | null;
	cancel_at_period_end: boolean;
	canceled_at: string | null;
	created_at: string;
	product: Product | null;
	items: SubscriptionItem[];
	metadata: Record<string, unknown>;
};

export interface UpdateSubscriptionParams {
	product_id?: string;
	trial_end?: string;
	payment_method_id?: string;
	metadata?: Record<string, unknown> | string;
	proration_behavior?: "invoice_now" | "next_cycle" | "none";
}

export interface CancelSubscriptionParams {
	cancel_at_period_end?: boolean;
	reason?: string | null;
}

export interface ListSubscriptionsParams extends PaginationParams {
	customer_id?: string;
	status?: string;
}

export class SubscriptionsResource {
	constructor(private client: BachsHttpClient) {}

	public async get(id: string): Promise<SubscriptionResponse> {
		return this.client.get(`/subscriptions/${id}`);
	}

	public async update(
		id: string,
		params: UpdateSubscriptionParams,
	): Promise<SubscriptionResponse> {
		return this.client.patch(`/subscriptions/${id}`, params);
	}

	public async list(
		params?: ListSubscriptionsParams,
	): Promise<PaginatedResponse<SubscriptionResponse>> {
		return this.client.get("/subscriptions", params);
	}

	public async cancel(
		id: string,
		params?: CancelSubscriptionParams,
	): Promise<SubscriptionResponse> {
		return this.client.post(`/subscriptions/${id}/cancel`, params ?? {});
	}
}
