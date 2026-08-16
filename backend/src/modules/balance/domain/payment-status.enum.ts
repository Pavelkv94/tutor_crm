export enum PaymentStatusEnum {
	PENDING = "PENDING",
	SUCCEEDED = "SUCCEEDED",
	CANCELED = "CANCELED",
	FAILED = "FAILED",
	/**
	 * Платёж получен, но не применён к балансу из-за конфликта валют: на балансе лежит
	 * остаток в другой валюте. В инвариант баланса не входит, применяется вручную
	 * через POST /api/payments/:id/apply после того, как админ разрулит конфликт.
	 */
	REQUIRES_ATTENTION = "REQUIRES_ATTENTION",
}
