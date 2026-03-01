// place files you want to import through the `$lib` alias in this folder.

// Re-export types
export type {
	PropertyDetails,
	PropertyType,
	UkRegion,
	Appliance,
	ApplianceSubOption,
	UsagePattern,
	FlexibilityLevel,
	UsageHabits,
	WizardState,
} from './types/wizard';

export type { TariffType, TimeOfUseRate, Tariff, ComparisonResult } from './types/tariff';

export type { ConsumptionProfile } from './models/consumption';

// Re-export functions
export { calculateConsumption } from './models/consumption';
export {
	calculateTariffCost,
	calculateTariffCostBreakdown,
	compareTariffs,
} from './models/comparison';

// Re-export data
export { DEFAULT_APPLIANCES } from './data/appliances';
export { getTariffsForRegion, getAllTariffs } from './data/tariffs';
