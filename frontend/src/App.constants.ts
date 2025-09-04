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
