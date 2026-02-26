import { describe, it, expect } from 'vitest';
import {
	createBookingSchema,
	createExpenseSchema,
	createAircraftSchema,
	createComplianceItemSchema,
} from './validation';

describe('createBookingSchema', () => {
	const validBooking = {
		aircraftId: '550e8400-e29b-41d4-a716-446655440000',
		startTime: '2026-03-01T10:00:00Z',
		endTime: '2026-03-01T12:00:00Z',
		notes: 'Cross-country flight',
	};

	it('accepts valid booking data', () => {
		const result = createBookingSchema.safeParse(validBooking);
		expect(result.success).toBe(true);
	});

	it('accepts booking without optional notes', () => {
		const { notes: _, ...withoutNotes } = validBooking;
		const result = createBookingSchema.safeParse(withoutNotes);
		expect(result.success).toBe(true);
	});

	it('rejects when endTime is before startTime', () => {
		const result = createBookingSchema.safeParse({
			...validBooking,
			startTime: '2026-03-01T12:00:00Z',
			endTime: '2026-03-01T10:00:00Z',
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('endTime');
		}
	});

	it('rejects when endTime equals startTime', () => {
		const result = createBookingSchema.safeParse({
			...validBooking,
			startTime: '2026-03-01T10:00:00Z',
			endTime: '2026-03-01T10:00:00Z',
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid UUID for aircraftId', () => {
		const result = createBookingSchema.safeParse({
			...validBooking,
			aircraftId: 'not-a-uuid',
		});
		expect(result.success).toBe(false);
	});

	it('rejects notes exceeding 500 characters', () => {
		const result = createBookingSchema.safeParse({
			...validBooking,
			notes: 'a'.repeat(501),
		});
		expect(result.success).toBe(false);
	});
});

describe('createExpenseSchema', () => {
	const validExpense = {
		amount: 5000,
		category: 'fuel' as const,
		description: 'Avgas fill-up at EGBJ',
		date: '2026-03-01',
	};

	it('accepts valid expense data', () => {
		const result = createExpenseSchema.safeParse(validExpense);
		expect(result.success).toBe(true);
	});

	it('rejects negative amount', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, amount: -100 });
		expect(result.success).toBe(false);
	});

	it('rejects zero amount', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, amount: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects amount exceeding £100,000 (10,000,000 pence)', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, amount: 10_000_001 });
		expect(result.success).toBe(false);
	});

	it('rejects decimal amount', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, amount: 12.5 });
		expect(result.success).toBe(false);
	});

	it('rejects invalid category', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, category: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('accepts all valid categories', () => {
		const categories = ['fuel', 'maintenance', 'insurance', 'hangar', 'landing', 'other'];
		for (const category of categories) {
			const result = createExpenseSchema.safeParse({ ...validExpense, category });
			expect(result.success).toBe(true);
		}
	});

	it('rejects empty description', () => {
		const result = createExpenseSchema.safeParse({ ...validExpense, description: '' });
		expect(result.success).toBe(false);
	});
});

describe('createAircraftSchema', () => {
	const validAircraft = {
		registration: 'G-ABCD',
		type: 'PA-28-161',
		name: 'Charlie Delta',
		baseAirfield: 'EGBJ',
	};

	it('accepts valid aircraft data', () => {
		const result = createAircraftSchema.safeParse(validAircraft);
		expect(result.success).toBe(true);
	});

	it('accepts aircraft without optional fields', () => {
		const result = createAircraftSchema.safeParse({
			registration: 'G-ABCD',
			type: 'PA-28-161',
		});
		expect(result.success).toBe(true);
	});

	it('rejects registration without G- prefix', () => {
		const result = createAircraftSchema.safeParse({ ...validAircraft, registration: 'ABCDE' });
		expect(result.success).toBe(false);
	});

	it('rejects lowercase registration', () => {
		const result = createAircraftSchema.safeParse({ ...validAircraft, registration: 'G-abcd' });
		expect(result.success).toBe(false);
	});

	it('rejects registration with wrong number of letters', () => {
		const result = createAircraftSchema.safeParse({ ...validAircraft, registration: 'G-ABC' });
		expect(result.success).toBe(false);
	});

	it('rejects empty type', () => {
		const result = createAircraftSchema.safeParse({ ...validAircraft, type: '' });
		expect(result.success).toBe(false);
	});
});

describe('createComplianceItemSchema', () => {
	const validItem = {
		aircraftId: '550e8400-e29b-41d4-a716-446655440000',
		type: 'arc' as const,
		name: 'Annual ARC Renewal',
		dueDate: '2026-06-15',
	};

	it('accepts valid compliance item data', () => {
		const result = createComplianceItemSchema.safeParse(validItem);
		expect(result.success).toBe(true);
	});

	it('accepts item with optional notes', () => {
		const result = createComplianceItemSchema.safeParse({
			...validItem,
			notes: 'Booked with engineer',
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid compliance type', () => {
		const result = createComplianceItemSchema.safeParse({ ...validItem, type: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('accepts all valid compliance types', () => {
		const types = ['arc', 'annual', 'insurance', '50hr', 'ad', 'other'];
		for (const type of types) {
			const result = createComplianceItemSchema.safeParse({ ...validItem, type });
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid UUID for aircraftId', () => {
		const result = createComplianceItemSchema.safeParse({
			...validItem,
			aircraftId: 'not-a-uuid',
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty name', () => {
		const result = createComplianceItemSchema.safeParse({ ...validItem, name: '' });
		expect(result.success).toBe(false);
	});

	it('rejects name exceeding 100 characters', () => {
		const result = createComplianceItemSchema.safeParse({
			...validItem,
			name: 'a'.repeat(101),
		});
		expect(result.success).toBe(false);
	});
});
