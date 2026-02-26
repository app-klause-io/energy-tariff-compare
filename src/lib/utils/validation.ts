import { z } from 'zod';

export const createBookingSchema = z.object({
	aircraftId: z.string().uuid(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	notes: z.string().max(500).optional(),
});

export const createExpenseSchema = z.object({
	amount: z.number().int().positive(),
	category: z.enum(['fuel', 'maintenance', 'insurance', 'hangar', 'landing', 'other']),
	description: z.string().min(1).max(200),
	date: z.string().date(),
});

export const createAircraftSchema = z.object({
	registration: z
		.string()
		.min(5)
		.max(7)
		.regex(/^G-[A-Z]{4}$/, 'Must be a valid UK registration (e.g. G-ABCD)'),
	type: z.string().min(1).max(50),
	name: z.string().max(50).optional(),
	baseAirfield: z.string().max(50).optional(),
});

export const createComplianceItemSchema = z.object({
	aircraftId: z.string().uuid(),
	type: z.enum(['arc', 'annual', 'insurance', '50hr', 'ad', 'other']),
	name: z.string().min(1).max(100),
	dueDate: z.string().date(),
	notes: z.string().max(500).optional(),
});

export type CreateBooking = z.infer<typeof createBookingSchema>;
export type CreateExpense = z.infer<typeof createExpenseSchema>;
export type CreateAircraft = z.infer<typeof createAircraftSchema>;
export type CreateComplianceItem = z.infer<typeof createComplianceItemSchema>;
