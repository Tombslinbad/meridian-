import type { BachsHttpClient } from "../client.js";
import type {
	PaginatedResponse,
	PaginationParams,
	Product,
} from "../types/index.js";

export interface CreateProductParams {
	name: string;
	price: {
		price_type: string;
		currency: string;
		amount: string;
	};
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	billing_cycle?: Record<string, unknown> | null;
	trial_period?: Record<string, unknown> | null;
}

export interface UpdateProductParams {
	name?: string;
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	media?: string[];
	price?: Record<string, unknown> | null;
	billing_cycle?: Record<string, unknown> | null;
	trial_period?: Record<string, unknown> | null;
}

export interface ListProductsParams extends PaginationParams {
	include_archived?: boolean;
}

export class ProductsResource {
	constructor(private client: BachsHttpClient) {}

	public async create(params: CreateProductParams): Promise<Product> {
		return this.client.post("/products", params);
	}

	public async get(id: string): Promise<Product> {
		return this.client.get(`/products/${id}`);
	}

	public async update(
		id: string,
		params: UpdateProductParams,
	): Promise<Product> {
		return this.client.patch(`/products/${id}`, params);
	}

	public async list(
		params?: ListProductsParams,
	): Promise<PaginatedResponse<Product>> {
		return this.client.get("/products", params);
	}

	public async archive(id: string): Promise<Product> {
		return this.client.post(`/products/${id}/archive`);
	}

	public async unarchive(id: string): Promise<Product> {
		return this.client.post(`/products/${id}/unarchive`);
	}
}
