import type { BachsHttpClient } from "../client.js";
import type {
	PaginatedResponse,
	PaginationParams,
	PaymentInfo as PaymentResponse,
} from "../types/index.js";

export type PaymentInvoiceInfo = {
	id: string;
	status: string;
};

export type PaymentListItemResponse = {
	reference: string | null;
	id: string | null;
	status: string;
	is_refundable: boolean | null;
	amount: string;
	customer_name: string;
	customer_email: string;
	amount_paid: string | null;
	amount_remaining: string | null;
	settlement_amount: string | null;
	settlement_currency: string | null;
	fee: string | null;
	vat: string | null;
	currency: string;
	meta: Record<string, unknown> | null;
	transaction_date: string | null;
	completed_at: string | null;
};

export interface ListPaymentsParams extends PaginationParams {
	customer_id?: string;
	status?: string;
}

export type PaymentMethodsResponse = {
	payment_methods: {
		id: string;
		display_name: string;
		icon: string;
		description: string;
		type: string;
		enabled_by_default: boolean;
		currencies: string[];
	}[];
};

export type SupportedCurrenciesResponse = {
	fiat?: string[];
	crypto?: string[];
};

export type PayoutSupportedCurrenciesResponse = {
	fiat: string[];
	crypto: string[];
};

export class PaymentsResource {
	constructor(private client: BachsHttpClient) {}

	public async get(id: string): Promise<PaymentResponse> {
		return this.client.get(`/payments/${id}`);
	}

	public async list(
		params?: ListPaymentsParams,
	): Promise<PaginatedResponse<PaymentListItemResponse>> {
		return this.client.get("/payments", params);
	}

	public async listPaymentMethods(): Promise<PaymentMethodsResponse> {
		return this.client.get("/payment-methods");
	}

	public async listSupportedCurrencies(): Promise<SupportedCurrenciesResponse> {
		return this.client.get("/currencies/supported");
	}

	public async listPayoutSupportedCurrencies(): Promise<PayoutSupportedCurrenciesResponse> {
		return this.client.get("/currencies/payout-supported");
	}
}
