import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	boolean,
	numeric,
	date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Users (synced from Clerk via webhook)
// ============================================================
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	clerkId: text('clerk_id').notNull().unique(),
	email: text('email').notNull(),
	name: text('name').notNull(),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// Groups (aircraft partnerships)
// ============================================================
export const groups = pgTable('groups', {
	id: uuid('id').primaryKey().defaultRandom(),
	clerkOrgId: text('clerk_org_id').notNull().unique(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// Group Members (junction: users <-> groups)
// ============================================================
export const groupMembers = pgTable('group_members', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	role: text('role').notNull().default('member'), // 'admin' | 'member'
	joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// ============================================================
// Aircraft
// ============================================================
export const aircraft = pgTable('aircraft', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	registration: text('registration').notNull(), // e.g. G-ABCD
	type: text('type').notNull(), // e.g. PA-28-161
	name: text('name'), // e.g. "Charlie Delta"
	baseAirfield: text('base_airfield'), // e.g. EGBJ
	totalHours: numeric('total_hours'),
	imageUrl: text('image_url'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// Bookings
// ============================================================
export const bookings = pgTable('bookings', {
	id: uuid('id').primaryKey().defaultRandom(),
	aircraftId: uuid('aircraft_id')
		.notNull()
		.references(() => aircraft.id),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	startTime: timestamp('start_time').notNull(),
	endTime: timestamp('end_time').notNull(),
	notes: text('notes'),
	cancelled: boolean('cancelled').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Expenses
// ============================================================
export const expenses = pgTable('expenses', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	paidByUserId: uuid('paid_by_user_id')
		.notNull()
		.references(() => users.id),
	amount: integer('amount').notNull(), // pence (£12.50 = 1250)
	currency: text('currency').notNull().default('GBP'),
	category: text('category').notNull(), // 'fuel' | 'maintenance' | 'insurance' | 'hangar' | 'landing' | 'other'
	description: text('description').notNull(),
	receiptUrl: text('receipt_url'),
	date: date('date').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Expense Splits
// ============================================================
export const expenseSplits = pgTable('expense_splits', {
	id: uuid('id').primaryKey().defaultRandom(),
	expenseId: uuid('expense_id')
		.notNull()
		.references(() => expenses.id),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	amount: integer('amount').notNull(), // pence
	settled: boolean('settled').default(false).notNull(),
	settledAt: timestamp('settled_at'),
});

// ============================================================
// Compliance Items
// ============================================================
export const complianceItems = pgTable('compliance_items', {
	id: uuid('id').primaryKey().defaultRandom(),
	aircraftId: uuid('aircraft_id')
		.notNull()
		.references(() => aircraft.id),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	type: text('type').notNull(), // 'arc' | 'annual' | 'insurance' | '50hr' | 'ad' | 'other'
	name: text('name').notNull(),
	dueDate: date('due_date').notNull(),
	completedDate: date('completed_date'),
	notes: text('notes'),
	documentUrl: text('document_url'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================
// Maintenance Log
// ============================================================
export const maintenanceLog = pgTable('maintenance_log', {
	id: uuid('id').primaryKey().defaultRandom(),
	aircraftId: uuid('aircraft_id')
		.notNull()
		.references(() => aircraft.id),
	groupId: uuid('group_id')
		.notNull()
		.references(() => groups.id),
	complianceItemId: uuid('compliance_item_id').references(() => complianceItems.id),
	description: text('description').notNull(),
	performedBy: text('performed_by'),
	cost: integer('cost'), // pence
	date: date('date').notNull(),
	receiptUrl: text('receipt_url'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Relations
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
	groupMembers: many(groupMembers),
	bookings: many(bookings),
	expenses: many(expenses),
	expenseSplits: many(expenseSplits),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
	members: many(groupMembers),
	aircraft: many(aircraft),
	bookings: many(bookings),
	expenses: many(expenses),
	complianceItems: many(complianceItems),
	maintenanceLog: many(maintenanceLog),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
	group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
	user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const aircraftRelations = relations(aircraft, ({ one, many }) => ({
	group: one(groups, { fields: [aircraft.groupId], references: [groups.id] }),
	bookings: many(bookings),
	complianceItems: many(complianceItems),
	maintenanceLog: many(maintenanceLog),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
	aircraft: one(aircraft, { fields: [bookings.aircraftId], references: [aircraft.id] }),
	user: one(users, { fields: [bookings.userId], references: [users.id] }),
	group: one(groups, { fields: [bookings.groupId], references: [groups.id] }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
	group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
	paidBy: one(users, { fields: [expenses.paidByUserId], references: [users.id] }),
	splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
	expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
	user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}));

export const complianceItemsRelations = relations(complianceItems, ({ one, many }) => ({
	aircraft: one(aircraft, { fields: [complianceItems.aircraftId], references: [aircraft.id] }),
	group: one(groups, { fields: [complianceItems.groupId], references: [groups.id] }),
	maintenanceLog: many(maintenanceLog),
}));

export const maintenanceLogRelations = relations(maintenanceLog, ({ one }) => ({
	aircraft: one(aircraft, { fields: [maintenanceLog.aircraftId], references: [aircraft.id] }),
	group: one(groups, { fields: [maintenanceLog.groupId], references: [groups.id] }),
	complianceItem: one(complianceItems, {
		fields: [maintenanceLog.complianceItemId],
		references: [complianceItems.id],
	}),
}));
