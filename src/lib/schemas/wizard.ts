import { z } from 'zod';

export const PROPERTY_TYPES = ['flat', 'terrace', 'semi-detached', 'detached'] as const;

export const UK_REGIONS = [
	'eastern',
	'east-midlands',
	'london',
	'merseyside',
	'north-east',
	'north-west',
	'north-scotland',
	'south-east',
	'south-scotland',
	'south-wales',
	'south-west',
	'southern',
	'west-midlands',
	'yorkshire',
] as const;

export const USAGE_PATTERNS = ['morning', 'daytime', 'evening', 'night'] as const;

export const FLEXIBILITY_LEVELS = ['low', 'medium', 'high'] as const;

export const INSULATION_QUALITIES = ['well-insulated', 'average', 'draughty'] as const;

export const propertyDetailsSchema = z.object({
	type: z.enum(PROPERTY_TYPES),
	bedrooms: z.number().int().min(1).max(5),
	occupants: z.number().int().min(1).max(4),
	region: z.enum(UK_REGIONS),
	hasGas: z.boolean().default(true),
	insulation: z.enum(INSULATION_QUALITIES).default('average'),
});

const applianceSubOptionSchema = z.object({
	label: z.string().min(1),
	value: z.string().min(1),
	options: z
		.array(
			z.object({
				label: z.string().min(1),
				value: z.string().min(1),
			}),
		)
		.min(1),
});

export const applianceSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	icon: z.string().min(1),
	enabled: z.boolean(),
	annualKwhEstimate: z.number(),
	subOptions: applianceSubOptionSchema.optional(),
	selectedSubOption: z.string().optional(),
});

export const usageHabitsSchema = z.object({
	pattern: z.enum(USAGE_PATTERNS),
	overnightAppliances: z.boolean(),
	flexibility: z.enum(FLEXIBILITY_LEVELS),
});

export const wizardStateSchema = z.object({
	step: z.number().int().min(1).max(3),
	property: propertyDetailsSchema,
	appliances: z.array(applianceSchema),
	habits: usageHabitsSchema,
});
