import type { BachsHttpClient } from "../client.js";

export type AccountBalance = {
	currency: string;
	available_balance: string;
	pending_balance: string;
};

export type AccountBalanceResponse = {
	account_id: string;
	balances: AccountBalance[];
	total_balance_usd: string;
	pending_settlements_by_day: Record<string, unknown>[];
};

export class AccountsResource {
	constructor(private client: BachsHttpClient) {}

	public async getBalances(): Promise<AccountBalanceResponse> {
		return this.client.get("/accounts/balances");
	}
}
