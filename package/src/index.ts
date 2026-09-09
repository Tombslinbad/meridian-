import { BachsHttpClient } from "./client.js";
import { AccountsResource } from "./resources/accounts.js";
import { CheckoutSessionsResource } from "./resources/checkout-sessions.js";
import { ConnectedAccountsResource } from "./resources/connected-accounts.js";
import { CustomerSessionsResource } from "./resources/customer-sessions.js";
import { CustomersResource } from "./resources/customers.js";
import { MediaResource } from "./resources/media.js";
import { PaymentRailsResource } from "./resources/payment-rails.js";
import { PaymentsResource } from "./resources/payments.js";
import { ProductsResource } from "./resources/products.js";
import { RefundsResource } from "./resources/refunds.js";
import { SubscriptionsResource } from "./resources/subscriptions.js";
import { TransfersResource } from "./resources/transfers.js";
import { WebhooksResource } from "./resources/webhooks.js";
import type { BachsClientOptions } from "./types/index.js";

export class Bachs {
	private client: BachsHttpClient;

	public products: ProductsResource;
	public checkoutSessions: CheckoutSessionsResource;
	public subscriptions: SubscriptionsResource;
	public customers: CustomersResource;
	public customerSessions: CustomerSessionsResource;
	public payments: PaymentsResource;
	public paymentRails: PaymentRailsResource;
	public refunds: RefundsResource;
	public accounts: AccountsResource;
	public connectedAccounts: ConnectedAccountsResource;
	public transfers: TransfersResource;
	public media: MediaResource;
	public webhooks: WebhooksResource;

	constructor(options: BachsClientOptions) {
		this.client = new BachsHttpClient(options);

		this.products = new ProductsResource(this.client);
		this.checkoutSessions = new CheckoutSessionsResource(this.client);
		this.subscriptions = new SubscriptionsResource(this.client);
		this.customers = new CustomersResource(this.client);
		this.customerSessions = new CustomerSessionsResource(this.client);
		this.payments = new PaymentsResource(this.client);
		this.paymentRails = new PaymentRailsResource(this.client);
		this.refunds = new RefundsResource(this.client);
		this.accounts = new AccountsResource(this.client);
		this.connectedAccounts = new ConnectedAccountsResource(this.client);
		this.transfers = new TransfersResource(this.client);
		this.media = new MediaResource(this.client);
		this.webhooks = new WebhooksResource(this.client);
	}
}

export * from "./client.js";
export * from "./errors.js";
export * from "./resources/accounts.js";
export * from "./resources/checkout-sessions.js";
export * from "./resources/connected-accounts.js";
export * from "./resources/customer-sessions.js";
export * from "./resources/customers.js";
export * from "./resources/media.js";
export * from "./resources/payment-rails.js";
export * from "./resources/payments.js";
export * from "./resources/products.js";
export * from "./resources/refunds.js";
export * from "./resources/subscriptions.js";
export * from "./resources/transfers.js";
export * from "./resources/webhooks.js";
// Export Types
export * from "./types/index.js";
