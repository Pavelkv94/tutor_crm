export enum PlanType {
	INDIVIDUAL = "INDIVIDUAL",
	PAIR = "PAIR",
}

export enum PlanCurrency {
	USD = "USD",
	EUR = "EUR",
	PLN = "PLN",
	BYN = "BYN",
}


export enum Severity {
	ERROR = 'error',
	WARNING = 'warning',
	INFO = 'info',
	SUCCESS = 'success',
}

export enum LessonStatus {
	CANCELLED = "CANCELLED",
	COMPLETED = "COMPLETED",
	MISSED = "MISSED",
	RESCHEDULED = "RESCHEDULED",
	PENDING = "PENDING",
}

export const currencies = [{
	label: PlanCurrency.USD,
	flag: "🇺🇸",
}, {
	label: PlanCurrency.EUR,
	flag: "🇪🇺",
}, {
	label: PlanCurrency.PLN,
	flag: "🇵🇱",
}, {
	label: PlanCurrency.BYN,
	flag: "🇧🇾",
}];

export const planTypes = [PlanType.INDIVIDUAL, PlanType.PAIR];
export const durations = [30, 45, 60];
