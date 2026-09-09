import type { BachsHttpClient } from "../client.js";
import type {
	Customer,
	CustomerBillingAddress,
	PaginatedResponse,
	PaginationParams,
} from "../types/index.js";

export interface CreateCustomerParams {
	email: string;
	name?: string | null;
	phone_number?: string | null;
	metadata?: Record<string, unknown>;
	billing_address?: CustomerBillingAddress | null;
}

export interface UpdateCustomerParams {
	email?: string | null;
	name?: string | null;
	phone_number?: string | null;
	metadata?: Record<string, unknown> | null;
	billing_address?: CustomerBillingAddress | null;
}

export interface ListCustomersParams extends PaginationParams {
	search?: string;
}

export class CustomersResource {
	constructor(private client: BachsHttpClient) {}

	public async create(params: CreateCustomerParams): Promise<Customer> {
		return this.client.post("/customers", params);
	}

	public async get(id: string): Promise<Customer> {
		return this.client.get(`/customers/${id}`);
	}

	public async update(
		id: string,
		params: UpdateCustomerParams,
	): Promise<Customer> {
		return this.client.patch(`/customers/${id}`, params);
	}

	public async list(
		params?: ListCustomersParams,
	): Promise<PaginatedResponse<Customer>> {
		return this.client.get("/customers", params);
	}
}
