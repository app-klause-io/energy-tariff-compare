import { describe, it, expect } from 'vitest';
import {
	propertyDetailsSchema,
	applianceSchema,
	usageHabitsSchema,
	wizardStateSchema,
} from './wizard';

describe('propertyDetailsSchema', () => {
	it('accepts valid property details', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 2,
			occupants: 2,
			region: 'london',
		});
		expect(result.success).toBe(true);
	});

	it('accepts all property types', () => {
		for (const type of ['flat', 'terrace', 'semi-detached', 'detached']) {
			const result = propertyDetailsSchema.safeParse({
				type,
				bedrooms: 1,
				occupants: 1,
				region: 'eastern',
			});
			expect(result.success).toBe(true);
		}
	});

	it('accepts all UK regions', () => {
		const regions = [
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
		];
		for (const region of regions) {
			const result = propertyDetailsSchema.safeParse({
				type: 'flat',
				bedrooms: 1,
				occupants: 1,
				region,
			});
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid property type', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'mansion',
			bedrooms: 2,
			occupants: 2,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid region', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 2,
			occupants: 2,
			region: 'narnia',
		});
		expect(result.success).toBe(false);
	});

	it('rejects bedrooms below 1', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 0,
			occupants: 2,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects bedrooms above 5', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 6,
			occupants: 2,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-integer bedrooms', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 2.5,
			occupants: 2,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects occupants below 1', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 2,
			occupants: 0,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects occupants above 4', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 2,
			occupants: 5,
			region: 'london',
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing required fields', () => {
		const result = propertyDetailsSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it('accepts boundary values (1 bedroom, 1 occupant)', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'flat',
			bedrooms: 1,
			occupants: 1,
			region: 'london',
		});
		expect(result.success).toBe(true);
	});

	it('accepts boundary values (5 bedrooms, 4 occupants)', () => {
		const result = propertyDetailsSchema.safeParse({
			type: 'detached',
			bedrooms: 5,
			occupants: 4,
			region: 'yorkshire',
		});
		expect(result.success).toBe(true);
	});
});

describe('applianceSchema', () => {
	it('accepts a valid enabled appliance with sub-options', () => {
		const result = applianceSchema.safeParse({
			id: 'ev',
			name: 'Electric Vehicle',
			icon: '\u{1F697}',
			enabled: true,
			annualKwhEstimate: 3500,
			subOptions: {
				label: 'Charge overnight?',
				value: 'overnight',
				options: [
					{ label: 'Yes', value: 'overnight' },
					{ label: 'No', value: 'daytime' },
				],
			},
			selectedSubOption: 'overnight',
		});
		expect(result.success).toBe(true);
	});

	it('accepts a valid disabled appliance without sub-options', () => {
		const result = applianceSchema.safeParse({
			id: 'ev',
			name: 'Electric Vehicle',
			icon: '\u{1F697}',
			enabled: false,
			annualKwhEstimate: 3500,
		});
		expect(result.success).toBe(true);
	});

	it('accepts negative annual kWh (solar panels)', () => {
		const result = applianceSchema.safeParse({
			id: 'solar',
			name: 'Solar Panels',
			icon: '\u{2600}\u{FE0F}',
			enabled: true,
			annualKwhEstimate: -3000,
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty id', () => {
		const result = applianceSchema.safeParse({
			id: '',
			name: 'Test',
			icon: 'x',
			enabled: false,
			annualKwhEstimate: 100,
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty name', () => {
		const result = applianceSchema.safeParse({
			id: 'test',
			name: '',
			icon: 'x',
			enabled: false,
			annualKwhEstimate: 100,
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing required fields', () => {
		const result = applianceSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe('usageHabitsSchema', () => {
	it('accepts valid usage habits', () => {
		const result = usageHabitsSchema.safeParse({
			pattern: 'evening',
			overnightAppliances: true,
			flexibility: 'medium',
		});
		expect(result.success).toBe(true);
	});

	it('accepts all usage patterns', () => {
		for (const pattern of ['morning', 'daytime', 'evening', 'night']) {
			const result = usageHabitsSchema.safeParse({
				pattern,
				overnightAppliances: false,
				flexibility: 'low',
			});
			expect(result.success).toBe(true);
		}
	});

	it('accepts all flexibility levels', () => {
		for (const flexibility of ['low', 'medium', 'high']) {
			const result = usageHabitsSchema.safeParse({
				pattern: 'morning',
				overnightAppliances: false,
				flexibility,
			});
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid usage pattern', () => {
		const result = usageHabitsSchema.safeParse({
			pattern: 'afternoon',
			overnightAppliances: false,
			flexibility: 'low',
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid flexibility level', () => {
		const result = usageHabitsSchema.safeParse({
			pattern: 'morning',
			overnightAppliances: false,
			flexibility: 'extreme',
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing pattern', () => {
		const result = usageHabitsSchema.safeParse({
			overnightAppliances: false,
			flexibility: 'low',
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing flexibility', () => {
		const result = usageHabitsSchema.safeParse({
			pattern: 'morning',
			overnightAppliances: false,
		});
		expect(result.success).toBe(false);
	});
});

describe('wizardStateSchema', () => {
	const validState = {
		step: 1,
		property: {
			type: 'flat',
			bedrooms: 2,
			occupants: 2,
			region: 'london',
		},
		appliances: [
			{
				id: 'ev',
				name: 'Electric Vehicle',
				icon: '\u{1F697}',
				enabled: false,
				annualKwhEstimate: 3500,
			},
		],
		habits: {
			pattern: 'evening',
			overnightAppliances: false,
			flexibility: 'medium',
		},
	};

	it('accepts valid complete wizard state', () => {
		const result = wizardStateSchema.safeParse(validState);
		expect(result.success).toBe(true);
	});

	it('accepts step 1', () => {
		const result = wizardStateSchema.safeParse({ ...validState, step: 1 });
		expect(result.success).toBe(true);
	});

	it('accepts step 3', () => {
		const result = wizardStateSchema.safeParse({ ...validState, step: 3 });
		expect(result.success).toBe(true);
	});

	it('rejects step 0', () => {
		const result = wizardStateSchema.safeParse({ ...validState, step: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects step 4', () => {
		const result = wizardStateSchema.safeParse({ ...validState, step: 4 });
		expect(result.success).toBe(false);
	});

	it('accepts empty appliances array', () => {
		const result = wizardStateSchema.safeParse({ ...validState, appliances: [] });
		expect(result.success).toBe(true);
	});

	it('rejects missing property', () => {
		const { property: _, ...rest } = validState;
		const result = wizardStateSchema.safeParse(rest);
		expect(result.success).toBe(false);
	});

	it('rejects missing habits', () => {
		const { habits: _, ...rest } = validState;
		const result = wizardStateSchema.safeParse(rest);
		expect(result.success).toBe(false);
	});
});
