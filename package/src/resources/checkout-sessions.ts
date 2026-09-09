import type { BachsHttpClient } from "../client.js";
import type { PaymentInfo as Charge, Product } from "../types/index.js";

export type BaseCheckoutSessionCustomer = {
	customer_id: string;
	email: string;
	name: string | null;
};

export type CheckoutSessionCustomer =
	| {
			customer_id: string;
	  }
	| {
			customer_id?: undefined;
			email: string;
			name: string;
			phone_number?: string | null;
	  };

type Pricing = {
	pricing_type: "fixed" | "custom" | "free";
	amount?: string;
	preset_amount?: string;
	minimum_amount?: string;
	maximum_amount?: string;
};

type CartProduct = {
	product_id: string;
	quantity: number;
	amount?: string | null;
	pricing?: Pricing;
};

export interface BaseCheckoutSession {
	checkout_id: string;
	status: "OPEN" | "COMPLETED" | "EXPIRED" | "CANCELLED";
	amount: string;
	currency: string;
	created_at: string;
	updated_at: string;
	recurring: {
		interval: "day" | "week" | "month" | "year";
		interval_count: number;
	} | null;
	payment_status:
		| "requires_payment_method"
		| "requires_confirmation"
		| "requires_action"
		| "processing"
		| "succeeded"
		| "failed"
		| "canceled"
		| null;
	source_type: "CHECKOUT_SESSION" | "API" | null;
	reference: string | null;
	charge: Charge | null;
	payment_method: string | null;
	customer: BaseCheckoutSessionCustomer;
	success_url: string | null;
	cancel_url: string | null;
	products: Product[] | null;
	billing_currency: string | null;
	session_mode: "CART" | "SELECTION" | null;
	metadata: Record<string, unknown> | null;
	expires_at: string | null;
	completed_at: string | null;
}

export interface CreateCheckoutSessionResponse
	extends Omit<
		BaseCheckoutSession,
		"status" | "recurring" | "source_type" | "products" | "billing_currency"
	> {
	checkout_url: string;
	status: "open" | "complete" | "expired" | "cancelled";
	customer_email?: string;
	client_reference_id?: string;
	mode?: "payment" | "subscription";
	recurring: {
		interval: "day" | "week" | "month" | "year";
		interval_count: number;
	};
	source_type: "CHECKOUT_SESSION" | "API";
	client_secret: string | null;
	products: Product[];
	billing_currency: string;
}

export type CreateCheckoutSessionParams = {
	customer: CheckoutSessionCustomer;
	billing_currency?: string;
	allowed_payment_method_types?: Array<
		"card" | "crypto" | "bank_transfer" | "mobile_money"
	>;
	cancel_url?: string;
	success_url: string;
	return_url?: string;
	metadata?: Record<string, unknown>;
	reference?: string;
	expires_in_minutes?: number;
} & (
	| {
			product_cart: CartProduct[];
			pricing?: Pricing;
	  }
	| {
			pricing: Pricing;
			product_cart?: CartProduct[];
	  }
);

export class CheckoutSessionsResource {
	constructor(private client: BachsHttpClient) {}

	public async create(
		params: CreateCheckoutSessionParams,
	): Promise<CreateCheckoutSessionResponse> {
		return this.client.post("/checkout-sessions", params);
	}

	public async get(id: string): Promise<BaseCheckoutSession> {
		return this.client.get(`/checkout-sessions/${id}`);
	}
}
