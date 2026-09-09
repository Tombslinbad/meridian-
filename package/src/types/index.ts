export interface BachsClientOptions {
	apiKey: string;
	baseUrl?: string;
	fetch?: typeof fetch;
}

export interface PaginationParams {
	limit?: number;
	cursor?: string;
	offset?: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	pagination: {
		next_cursor: string | null;
		prev_cursor: string | null;
		has_more: boolean;
		limit: number;
		offset: number;
		returned: number;
		total: number;
	};
}

export type LineItem = {
	product: Product;
	quantity: number;
	price?: Price;
};

export type CustomerBillingAddress = {
	line1: string | null;
	line2: string | null;
	city: string | null;
	state: string | null;
	postal_code: string | null;
	country: string | null;
};

export type Customer = {
	customer_id: string;
	email: string | null;
	name: string | null;
	phone_number: string | null;
	metadata: Record<string, unknown>;
	created_at: string | null;
	updated_at: string | null;
	billing_address: CustomerBillingAddress | null;
};

/**
 * Decimal string at the currency's precision (e.g. "29.00"). Never use minor units.
 */
export type DecimalString = string;

export interface Price {
	price_type: "fixed" | "custom" | "free";
	currency: string;
	amount: DecimalString;
}

export type SubscriptionCadence = {
	interval: "day" | "week" | "month" | "year";
	frequency: number;
};

export type Product = {
	id: string;
	name: string;
	description: string | null;
	metadata?: Record<string, unknown> | null;
	organization_id?: string;
	price?: {
		price_type?: string;
		currency: string;
		amount: string;
		preset_amount?: string | null;
		minimum_amount?: string | null;
		maximum_amount?: string | null;
		currency_options?: {
			currency: string;
			amount: string | null;
			minimum_amount: string | null;
			maximum_amount: string | null;
		}[];
	};
	prices?: Array<{
		currency: string;
		amount: string | null;
		minimum_amount: string | null;
		maximum_amount: string | null;
		is_default: boolean;
	}>;
	status?: "active" | "archived" | string;
	media?: {
		id: string;
		url: string | null;
		file_name: string;
		mime_type: string;
		file_size_bytes: number;
		created_at: string;
	}[];
	actor_id?: string;
	created_at?: string;
	updated_at?: string;
	archived_at?: string | null;
	billing_cycle?: SubscriptionCadence | null;
	trial_period?: SubscriptionCadence | null;
	total_payments?: number;
	total_amount?: string;
};

export interface PaymentInfo {
	status:
		| "created"
		| "processing"
		| "succeeded"
		| "accepted"
		| "failed"
		| "expired"
		| "cancelled"
		| "refunded"
		| "partially_refunded"
		| "underpaid"
		| "overpaid";
	amount: string;
	currency: string;
	created_at: string;
	updated_at: string;
	reference: string | null;
	payment_id: string;
	billing_reason?:
		| "purchase"
		| "subscription_create"
		| "subscription_cycle"
		| "subscription_update";
	checkout_id: string | null;
	is_refundable: boolean | null;
	amount_paid?: string | null;
	amount_remaining?: string | null;
	settlement_amount?: string | null;
	settlement_currency?: string | null;
	rate?: string | null;
	customer?: Customer;
	invoice?: Record<string, unknown> | null;
	payment_method?: string | null;
	payment_method_data?: Record<string, unknown> | null;
	payment_network?: string | null;
	payment_network_data?: Record<string, unknown> | null;
	environment?: "live" | "sandbox" | null;
	metadata?: Record<string, unknown> | null;
	products?: Product[];
	fee_usd?: string | null;
	merchant_bears_cost?: boolean | null;
	channel?: string | null;
	narration?: string | null;
	meta?: Record<string, unknown> | null;
	message?: string | null;
	line_items?: LineItem[] | null;
	subscription_id?: string | null;
	refunds?: string[] | null;
	status_history?:
		| {
				status: string;
				occurred_at: string;
				provider_reference: string | null;
				reason: string | null;
		  }[]
		| null;
	completed_at?: string | null;
}

export type FileParam = File | Blob | Buffer | FormData;
