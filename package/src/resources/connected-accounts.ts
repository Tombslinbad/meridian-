import type { BachsHttpClient } from "../client.js";
import type {
	FileParam,
	PaginatedResponse,
	PaginationParams,
} from "../types/index.js";
import { prepareFile } from "../utils.js";
import type { UploadResponse } from "./media.js";

export type CapabilityRequest = {
	requested?: boolean;
};

export type ControllerRequest = {
	fees?: {
		payer?: "account" | "platform";
	};
};

export type OrganizationResponse = {
	id: string;
	name: string | null;
	owner_user_id: string;
	parent_organization_id: string | null;
	country: string | null;
	fee_handling: "org_pays_fee" | "customer_pays_fee";
	enabled_payment_methods: Record<string, unknown> | null;
	adaptive_pricing: boolean;
	balance_currencies: string[];
	website: string | null;
	phone_number: string | null;
	company_name: string | null;
	enabled_capabilities: string[] | null;
	capabilities: Record<string, unknown> | null;
	requirements: Record<string, unknown> | null;
	fields_needing_resubmission?: number | null;
	sandbox_org_id: string | null;
	live_org_id: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	controller: Record<string, unknown> | null;
};

export interface CreateConnectedAccountParams {
	contact_email: string;
	display_name?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	country?: string | null;
	entity_type?: "company" | "individual" | "business" | null;
	capabilities?: Record<string, CapabilityRequest> | null;
	controller?: ControllerRequest;
}

export interface UpdateConnectedAccountParams {
	capabilities?: Record<string, CapabilityRequest>;
}

export interface ListConnectedAccountsParams extends PaginationParams {}

export class ConnectedAccountsResource {
	constructor(private client: BachsHttpClient) {}

	public async create(
		params: CreateConnectedAccountParams,
	): Promise<OrganizationResponse> {
		return this.client.post("/organizations/connected-accounts", params);
	}

	public async get(id: string): Promise<OrganizationResponse> {
		return this.client.get(`/connected-accounts/${id}`);
	}

	public async update(
		id: string,
		params: UpdateConnectedAccountParams,
	): Promise<OrganizationResponse> {
		return this.client.patch(`/connected-accounts/${id}`, params);
	}

	public async list(
		params?: ListConnectedAccountsParams,
	): Promise<PaginatedResponse<OrganizationResponse>> {
		return this.client.get("/organizations/connected-accounts", params);
	}

	public async getCapabilities(
		id: string,
	): Promise<ConnectedAccountCapabilitiesResponse> {
		return this.client.get(`/connected-accounts/${id}/capabilities`);
	}

	public async createAccountLink(
		id: string,
		params: CreateAccountLinkRequest,
	): Promise<AccountLinkResponse> {
		return this.client.post(`/connected-accounts/${id}/account-links`, params);
	}

	public async getTaskChecklist(id: string): Promise<TaskChecklistResponse> {
		return this.client.get(`/connected-accounts/${id}/requirements/checklist`);
	}

	public async listTasks(
		id: string,
		params?: PaginationParams,
	): Promise<PaginatedResponse<TaskItem>> {
		return this.client.get(
			`/connected-accounts/${id}/requirements/tasks`,
			params,
		);
	}

	public async getTaskValues(id: string): Promise<TaskValuesResponse> {
		return this.client.get(`/connected-accounts/${id}/requirements/values`);
	}

	public async submitTasks(
		id: string,
		params: SubmitTasksRequest,
	): Promise<TaskChecklistResponse> {
		return this.client.post(
			`/connected-accounts/${id}/requirements/submit`,
			params,
		);
	}

	public async getReusableIdentity(
		id: string,
	): Promise<ReusableIdentityResponse> {
		return this.client.get(
			`/connected-accounts/${id}/requirements/reusable-identity`,
		);
	}

	public async applyReusableIdentity(
		id: string,
		params: ApplyReusableIdentityRequest,
	): Promise<ApplyReusableIdentityResponse> {
		return this.client.post(
			`/connected-accounts/${id}/requirements/reusable-identity/apply`,
			params,
		);
	}

	public async listTaskBanks(id: string): Promise<TaskBankListResponse> {
		return this.client.get(`/connected-accounts/${id}/requirements/banks`);
	}

	public async listTaskMobileMoney(
		id: string,
	): Promise<TaskMobileMoneyListResponse> {
		return this.client.get(`/connected-accounts/${id}/requirements/momo`);
	}

	public async resolveTaskBankAccount(
		id: string,
		params: ResolveTaskBankAccountRequest,
	): Promise<ResolveTaskBankAccountResponse> {
		return this.client.post(
			`/connected-accounts/${id}/requirements/accounts/resolve`,
			params,
		);
	}

	public async createUpload(
		id: string,
		file: FileParam,
	): Promise<UploadResponse> {
		const requestBody = prepareFile(file);
		return this.client.post(`/connected-accounts/${id}/uploads`, requestBody);
	}

	public async getUpload(
		id: string,
		uploadId: string,
	): Promise<UploadResponse> {
		return this.client.get(`/connected-accounts/${id}/uploads/${uploadId}`);
	}
}

export type CapabilityStatusDetail = {
	code: string;
	message: string;
};

export type ConnectedAccountCapability = {
	name: "payouts" | "transfers" | "conversions" | "connect";
	status: "active" | "pending" | "restricted" | "unrequested" | "unsupported";
	requested: boolean;
	status_details: CapabilityStatusDetail[] | null;
};

export type ConnectedAccountCapabilitiesResponse = {
	items: ConnectedAccountCapability[];
};

export interface CreateAccountLinkRequest {
	type: "onboarding" | "update";
	refresh_url: string;
	return_url: string;
	collection_options?: Record<string, unknown> | null;
}

export type AccountLinkResponse = {
	id: string;
	object: "connected_account_link";
	account: string;
	type: "onboarding" | "update";
	created: string;
	expires_at: string;
	url: string;
	previous_link_superseded: boolean;
};

export type TaskFieldReference = {
	id: string;
	type: string;
};

export type TaskFieldItem = {
	field_key: string;
	label: string;
	group: string | null;
	state:
		| "currently_due"
		| "eventually_due"
		| "pending_verification"
		| "pending_review"
		| "satisfied"
		| "past_due";
	provided: boolean;
	error_reason: string | null;
	reference: TaskFieldReference | null;
};

export type TaskCapabilityGroup = {
	capability_name: "payouts" | "transfers" | "conversions" | "connect";
	description: string | null;
	category: string | null;
	state: "requested" | "pending_review" | "enabled";
	satisfied: boolean;
	fields: TaskFieldItem[];
};

export type TaskChecklistResponse = {
	organization_id: string;
	entity_type: "company" | "individual" | null;
	country: string | null;
	currently_due: number;
	pending_review: number;
	in_verification: number;
	needs_attention: number;
	setup_status: "incomplete" | "awaiting_review" | "complete";
	checklist: TaskFieldItem[];
	capabilities: TaskCapabilityGroup[];
};

export type TaskItem = {
	id: string;
	title: string;
	description: string | null;
	type: "form_field" | "document" | "action" | "edit_section";
	status: "open" | "in_review" | "completed" | "rejected";
	field_ref: string | null;
	document_type: string | null;
	requirements: Record<string, unknown>;
	response_contract: {
		kind: string;
		submit_field: string;
		field_ref: string;
		requirements: Record<string, unknown>;
	};
	due_date: string | null;
	impacts_capability: string | null;
	section_key: string | null;
	past_due: boolean;
	rejection_reason: string | null;
	created_at: string;
	updated_at: string;
};

export type TaskValueItem = {
	field: string;
	label: string;
	group: string | null;
	provided: boolean;
	sensitive: boolean;
	value: string | null;
	display: string | null;
	reference_data: Record<string, unknown> | null;
};

export type TaskValuesResponse = {
	organization_id: string;
	entity_type: "company" | "individual" | null;
	values: TaskValueItem[];
	persons: Record<string, unknown>[];
};

export interface SubmitTasksRequest {
	fields?: Record<string, unknown>;
	draft?: boolean;
}

export type ReusableIdentityResponse = {
	available: boolean;
	person_public_id: string | null;
	first_name: string | null;
	last_name: string | null;
	country: string | null;
	verification_status: string | null;
	used_by?: string[];
};

export interface ApplyReusableIdentityRequest {
	person_public_id: string;
}

export type ApplyReusableIdentityResponse = {
	applied: boolean;
	verification_status: string;
};

export type TaskBankListResponse = {
	country: string;
	banks: { name: string; code: string }[];
};

export type TaskMobileMoneyListResponse = {
	country: string;
	providers: string[];
};

export interface ResolveTaskBankAccountRequest {
	account_number: string;
	bank_code: string;
	country?: string | null;
}

export type ResolveTaskBankAccountResponse = {
	resolved: boolean;
	account_name: string | null;
	account_number: string | null;
	message: string | null;
};
