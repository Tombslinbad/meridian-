import type { BachsHttpClient } from "../client.js";

export type PaymentRailOption = {
	id: string;
	name: string | null;
	active: boolean | null;
};

export type PaymentRailsResponse = {
	payment_method: string;
	currency: string;
	country_code: string | null;
	rails: PaymentRailOption[];
};

export interface GetPaymentRailsParams {
	payment_method: string;
	currency: string;
}

export class PaymentRailsResource {
	constructor(private client: BachsHttpClient) {}

	public async list(
		params: GetPaymentRailsParams,
	): Promise<PaymentRailsResponse> {
		return this.client.get("/payment-methods/rails", params);
	}
}
