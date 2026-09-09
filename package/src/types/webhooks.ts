import type { Customer, SubscriptionCadence } from "./index.js";

export type WebhookHeaders =
	| Record<string, string | string[] | undefined>
	| { get: (name: string) => string | null | undefined };

export interface BaseBachsEvent {
	id: string;
	type: string;
	created_at: string;
	organization_id: string;
	account?: string;
}

export interface CheckoutCompletedEvent extends BaseBachsEvent {
	type: "checkout.completed";
	data: {
		checkout_id: string;
		status: string;
		mode: string;
		payment_status: string;
		amount: string;
		currency: string | null;
		reference: string | null;
		customer: Customer | null;
		charge: Record<string, unknown> | null;
		subscription: { subscription_id: string } | null;
		success_url: string | null;
		cancel_url: string | null;
		metadata: Record<string, unknown>;
		completed_at: string;
		expires_at: string | null;
		created_at: string;
	};
}

export interface CheckoutExpiredEvent extends BaseBachsEvent {
	type: "checkout.expired";
	data: {
		checkout_id: string;
		status: string;
		mode: string;
		payment_status: null;
		amount: string;
		currency: string | null;
		reference: string | null;
		customer: Customer | null;
		charge: null;
		subscription: null;
		success_url: string | null;
		cancel_url: string | null;
		metadata: Record<string, unknown>;
		completed_at: null;
		expires_at: string;
		created_at: string;
	};
}

export interface CollectionSucceededEvent extends BaseBachsEvent {
	type: "collection.succeeded";
	data: {
		charge_id: string | null;
		checkout_id: string | null;
		reference: string | null;
		status: string;
		amount: string;
		currency: string;
		settlement_amount: string;
		settlement_currency: string;
		payment_method: string;
		processing_fee: string | null;
		processing_fee_currency: string | null;
		fee_bearer: string;
		product_cart:
			| {
					product_id: string;
					quantity: number;
					amount?: string;
			  }[]
			| null;
		customer: {
			id: string;
			email: string;
			name: string;
		};
		metadata: Record<string, unknown>;
	};
}

export interface CollectionFailedEvent extends BaseBachsEvent {
	type: "collection.failed";
	data: {
		charge_id: string;
		checkout_id: string | null;
		reference: string | null;
		status: string;
		amount: string;
		currency: string;
		settlement_amount: string;
		settlement_currency: string;
		payment_method: string;
		processing_fee: string | null;
		processing_fee_currency: string | null;
		fee_bearer: string;
		product_cart:
			| {
					product_id: string;
					quantity: number;
					amount?: string;
			  }[]
			| null;
		reason: string | null;
		customer: {
			id: string;
			email: string;
			name: string;
		};
		metadata: Record<string, unknown>;
	};
}

export interface CollectionUnderpaidEvent extends BaseBachsEvent {
	type: "collection.underpaid";
	data: {
		charge_id: string;
		reference: string | null;
		checkout_id: string | null;
		amount_paid: string;
		amount_expected: string;
		amount_remaining: string;
		currency: string;
		status: string;
		provider_reference: string | null;
		metadata: Record<string, unknown>;
	};
}

export interface CustomerSubscriptionEventData {
	subscription_id: string;
	customer: Customer;
	product_id: string;
	status: string;
	collection_method: string;
	currency: string;
	amount: string;
	billing_cycle: SubscriptionCadence;
	quantity: number;
	current_period_start: string;
	current_period_end: string;
	next_billed_at: string | null;
	trial_end: string | null;
	cancel_at_period_end: boolean;
	canceled_at: string | null;
	created_at: string;
	items: Record<string, unknown>[];
	metadata: Record<string, unknown>;
}

export interface CustomerSubscriptionCreatedEvent extends BaseBachsEvent {
	type: "customer.subscription.created";
	data: CustomerSubscriptionEventData;
}

export interface CustomerSubscriptionUpdatedEvent extends BaseBachsEvent {
	type: "customer.subscription.updated";
	data: CustomerSubscriptionEventData;
}

export interface CustomerSubscriptionDeletedEvent extends BaseBachsEvent {
	type: "customer.subscription.deleted";
	data: CustomerSubscriptionEventData;
}

export interface InvoiceEventData {
	invoice_id: string;
	subscription: { subscription_id: string } | null;
	customer: Customer;
	charge: Record<string, unknown> | null;
	status: string;
	collection_method: string;
	currency: string;
	subtotal: string;
	total: string;
	amount_paid: string;
	amount_remaining: string;
	period_start: string;
	period_end: string;
	attempt_count: number;
	next_payment_attempt: string | null;
	created_at: string;
	metadata: Record<string, unknown>;
}

export interface InvoiceCreatedEvent extends BaseBachsEvent {
	type: "invoice.created";
	data: InvoiceEventData;
}

export interface InvoicePaidEvent extends BaseBachsEvent {
	type: "invoice.paid";
	data: InvoiceEventData;
}

export interface InvoicePaymentFailedEvent extends BaseBachsEvent {
	type: "invoice.payment_failed";
	data: InvoiceEventData;
}

export interface PayoutEventData {
	withdrawal_id: string;
	reference: string | null;
	provider_reference: string | null;
	status: string;
	amount: string;
	currency: string;
	from_currency: string | null;
	to_currency: string | null;
	exchange_rate: string | null;
	to_amount: string | null;
	withdrawal_fee: string | null;
	net_from_amount: string | null;
}

export interface PayoutCreatedEvent extends BaseBachsEvent {
	type: "payout.created";
	data: PayoutEventData;
}

export interface PayoutPaidEvent extends BaseBachsEvent {
	type: "payout.paid";
	data: PayoutEventData;
}

export interface PayoutFailedEvent extends BaseBachsEvent {
	type: "payout.failed";
	data: PayoutEventData;
}

export interface RefundEventData {
	refund_id: string;
	charge_id: string;
	reference: string | null;
	status: string;
	requested_amount: string;
	refunded_amount: string | null;
	refund_fee_amount: string;
	fee_bearer: string;
	reason: string | null;
}

export interface RefundCreatedEvent extends BaseBachsEvent {
	type: "refund.created";
	data: RefundEventData;
}

export interface RefundPaidEvent extends BaseBachsEvent {
	type: "refund.paid";
	data: RefundEventData;
}

export interface RefundFailedEvent extends BaseBachsEvent {
	type: "refund.failed";
	data: RefundEventData;
}

export interface DisputeEventData {
	dispute_id: string;
	charge_id: string;
	amount: string;
	currency: string;
	status: string;
	is_response_editable: boolean;
	reason: string | null;
	response_deadline_at: string | null;
}

export interface DisputeCreatedEvent extends BaseBachsEvent {
	type: "dispute.created";
	data: DisputeEventData;
}

export interface DisputeUpdatedEvent extends BaseBachsEvent {
	type: "dispute.updated";
	data: DisputeEventData;
}

export interface ConversionEventData {
	conversion_id: string;
	quote_id: string;
	from_currency: string;
	to_currency: string;
	from_amount: string;
	to_amount: string;
	exchange_rate: string;
	status: string;
}

export interface ConversionCompletedEvent extends BaseBachsEvent {
	type: "conversion.completed";
	data: ConversionEventData;
}

export interface ConversionFailedEvent extends BaseBachsEvent {
	type: "conversion.failed";
	data: ConversionEventData;
}

export interface CustomerCreatedEvent extends BaseBachsEvent {
	type: "customer.created";
	data: Customer;
}

export interface CustomerUpdatedEvent extends BaseBachsEvent {
	type: "customer.updated";
	data: Customer;
}

export interface AccountUpdatedEvent extends BaseBachsEvent {
	type: "account.updated";
	data: {
		account: string;
		setup_status: string;
		outstanding: string[];
	};
}

export interface CapabilityUpdatedEvent extends BaseBachsEvent {
	type: "capability.updated";
	data: {
		account: string;
		capability: string;
		status: string;
		requested: boolean;
	};
}

export interface TransferCreatedEvent extends BaseBachsEvent {
	type: "transfer.created";
	data: {
		transfer_id: string;
		source: string;
		destination: string;
		amount: string;
		currency: string;
		description: string | null;
		metadata: Record<string, unknown>;
		created_at: string | null;
	};
}

export type BachsWebhookEvent =
	| CheckoutCompletedEvent
	| CheckoutExpiredEvent
	| CollectionSucceededEvent
	| CollectionFailedEvent
	| CollectionUnderpaidEvent
	| CustomerSubscriptionCreatedEvent
	| CustomerSubscriptionUpdatedEvent
	| CustomerSubscriptionDeletedEvent
	| InvoiceCreatedEvent
	| InvoicePaidEvent
	| InvoicePaymentFailedEvent
	| PayoutCreatedEvent
	| PayoutPaidEvent
	| PayoutFailedEvent
	| RefundCreatedEvent
	| RefundPaidEvent
	| RefundFailedEvent
	| DisputeCreatedEvent
	| DisputeUpdatedEvent
	| ConversionCompletedEvent
	| ConversionFailedEvent
	| CustomerCreatedEvent
	| CustomerUpdatedEvent
	| AccountUpdatedEvent
	| CapabilityUpdatedEvent
	| TransferCreatedEvent;

export type WebhookEndpoint = {
	endpoint_id: string;
	name: string;
	url: string;
	enabled: boolean;
	event_types: string[];
	created_at: string;
	updated_at: string;
};

export type CreateWebhookEndpointParams = {
	name: string;
	url: string;
	enabled?: boolean;
	event_types: string[];
};

export type UpdateWebhookEndpointParams = Partial<CreateWebhookEndpointParams>;

export type WebhookEventSummary = {
	event_id: string;
	event_type: string;
	created_at: string;
	attempts: number;
	success: number;
	failed: number;
	entity_type: string;
	entity_id: string;
	last_attempt_at: string;
};

export type WebhookEventAttempt = {
	attempt_id: string;
	attempt_no: number;
	status: string;
	created_at: string;
	updated_at: string;
	callback_url: string;
	http_status: number;
	response_snippet: string;
	last_error: string;
};

export type WebhookEventDetail = {
	event_id: string;
	event_type: string;
	created_at: string;
	payload: Record<string, unknown>;
	attempts: WebhookEventAttempt[];
	entity_type: string;
	entity_id: string;
};

export type WebhookDeliveryMetrics = {
	total: string;
	period: string;
	data: {
		date: string;
		success: number;
		failed: number;
	}[];
};
