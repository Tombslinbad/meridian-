export type BachsValidationError = {
	field: string;
	message: string;
	type: string;
};

export class BachsError extends Error {
	public status: number;
	public code?: string;
	public errors?: BachsValidationError[];

	constructor(
		message: string,
		status: number,
		code?: string,
		errors?: BachsValidationError[],
	) {
		super(message);
		this.name = "BachsError";
		this.status = status;
		this.code = code;
		if (errors) {
			this.errors = errors;
		}
		Object.setPrototypeOf(this, BachsError.prototype);
	}

	public toJSON() {
		return {
			name: this.name,
			message: this.message,
			status: this.status,
			code: this.code,
			errors: this.errors,
			stack: this.stack,
		};
	}
}

export class BachsSignatureVerificationError extends Error {
	constructor(
		message: string,
		public header?: string,
		public payload?: string,
	) {
		super(message);
		this.name = "BachsSignatureVerificationError";
		Object.setPrototypeOf(this, BachsSignatureVerificationError.prototype);
	}
}
