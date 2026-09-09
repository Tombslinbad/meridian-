import type { BachsHttpClient } from "../client.js";

export type PortalSessionResponse = {
	id: string;
	url: string;
};

export interface CreateCustomerSessionParams {
	customer_id: string;
	return_url?: string;
}

export class CustomerSessionsResource {
	constructor(private client: BachsHttpClient) {}

	public async create(
		params: CreateCustomerSessionParams,
	): Promise<PortalSessionResponse> {
		const { customer_id, ...rest } = params;
		return this.client.post(`/customers/${customer_id}/portal-sessions`, rest);
	}
}
