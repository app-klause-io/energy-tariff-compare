import {
	pgTable,
	pgEnum,
	uuid,
	text,
	timestamp,
	integer,
	boolean,
	numeric,
	date,
	index,
	unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Enums
// ============================================================
export const MEMBER_ROLES = ['admin', 'member'] as const;
export const memberRoleEnum = pgEnum('member_role', MEMBER_ROLES);

export const EXPENSE_CATEGORIES = [
	'fuel',
	'maintenance',
	'insurance',
	'hangar',
	'landing',
	'other',
] as const;
export const expenseCategoryEnum = pgEnum('expense_category', EXPENSE_CATEGORIES);

export const COMPLIANCE_TYPES = ['arc', 'annual', 'insurance', '50hr', 'ad', 'other'] as const;
export const complianceTypeEnum = pgEnum('compliance_type', COMPLIANCE_TYPES);

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
export const groupMembers = pgTable(
	'group_members',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: memberRoleEnum('role').notNull().default('member'),
		joinedAt: timestamp('joined_at').defaultNow().notNull(),
	},
	(t) => [
		unique('group_members_group_user_unique').on(t.groupId, t.userId),
		index('group_members_group_id_idx').on(t.groupId),
		index('group_members_user_id_idx').on(t.userId),
	],
);

// ============================================================
// Aircraft
// ============================================================
export const aircraft = pgTable(
	'aircraft',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		registration: text('registration').notNull(), // e.g. G-ABCD
		type: text('type').notNull(), // e.g. PA-28-161
		name: text('name'), // e.g. "Charlie Delta"
		baseAirfield: text('base_airfield'), // e.g. EGBJ
		totalHours: numeric('total_hours'),
		imageUrl: text('image_url'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		unique('aircraft_registration_group_unique').on(t.registration, t.groupId),
		index('aircraft_group_id_idx').on(t.groupId),
	],
);

// ============================================================
// Bookings
// ============================================================
export const bookings = pgTable(
	'bookings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		aircraftId: uuid('aircraft_id')
			.notNull()
			.references(() => aircraft.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		startTime: timestamp('start_time').notNull(),
		endTime: timestamp('end_time').notNull(),
		notes: text('notes'),
		cancelled: boolean('cancelled').default(false).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		index('bookings_aircraft_id_idx').on(t.aircraftId),
		index('bookings_user_id_idx').on(t.userId),
		index('bookings_group_id_idx').on(t.groupId),
		// Compound indexes for common query patterns
		index('bookings_conflict_idx').on(t.aircraftId, t.startTime, t.endTime),
		index('bookings_calendar_idx').on(t.groupId, t.cancelled, t.startTime),
	],
);

// ============================================================
// Expenses
// ============================================================
export const expenses = pgTable(
	'expenses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		paidByUserId: uuid('paid_by_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(), // pence (£12.50 = 1250)
		currency: text('currency').notNull().default('GBP'),
		category: expenseCategoryEnum('category').notNull(),
		description: text('description').notNull(),
		receiptUrl: text('receipt_url'),
		date: date('date').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		index('expenses_group_id_idx').on(t.groupId),
		index('expenses_paid_by_user_id_idx').on(t.paidByUserId),
	],
);

// ============================================================
// Expense Splits
// ============================================================
export const expenseSplits = pgTable(
	'expense_splits',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		expenseId: uuid('expense_id')
			.notNull()
			.references(() => expenses.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		amount: integer('amount').notNull(), // pence
		settled: boolean('settled').default(false).notNull(),
		settledAt: timestamp('settled_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		unique('expense_splits_expense_user_unique').on(t.expenseId, t.userId),
		index('expense_splits_expense_id_idx').on(t.expenseId),
		index('expense_splits_user_id_idx').on(t.userId),
	],
);

// ============================================================
// Compliance Items
// ============================================================
export const complianceItems = pgTable(
	'compliance_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		aircraftId: uuid('aircraft_id')
			.notNull()
			.references(() => aircraft.id, { onDelete: 'cascade' }),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		type: complianceTypeEnum('type').notNull(),
		name: text('name').notNull(),
		dueDate: date('due_date').notNull(),
		completedDate: date('completed_date'),
		notes: text('notes'),
		documentUrl: text('document_url'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		index('compliance_items_aircraft_id_idx').on(t.aircraftId),
		index('compliance_items_group_id_idx').on(t.groupId),
		// Compound index for compliance lookups by aircraft
		index('compliance_items_aircraft_due_idx').on(t.aircraftId, t.dueDate),
	],
);

// ============================================================
// Maintenance Log
// ============================================================
export const maintenanceLog = pgTable(
	'maintenance_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		aircraftId: uuid('aircraft_id')
			.notNull()
			.references(() => aircraft.id, { onDelete: 'cascade' }),
		groupId: uuid('group_id')
			.notNull()
			.references(() => groups.id, { onDelete: 'cascade' }),
		complianceItemId: uuid('compliance_item_id').references(() => complianceItems.id, {
			onDelete: 'set null',
		}),
		description: text('description').notNull(),
		performedBy: text('performed_by'),
		cost: integer('cost'), // pence
		date: date('date').notNull(),
		receiptUrl: text('receipt_url'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
	},
	(t) => [
		index('maintenance_log_aircraft_id_idx').on(t.aircraftId),
		index('maintenance_log_group_id_idx').on(t.groupId),
		index('maintenance_log_compliance_item_id_idx').on(t.complianceItemId),
	],
);

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
