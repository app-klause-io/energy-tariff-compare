import { describe, it, expect } from 'vitest';
import * as schema from './schema';

describe('schema exports', () => {
	it('exports all table definitions', () => {
		expect(schema.users).toBeDefined();
		expect(schema.groups).toBeDefined();
		expect(schema.groupMembers).toBeDefined();
		expect(schema.aircraft).toBeDefined();
		expect(schema.bookings).toBeDefined();
		expect(schema.expenses).toBeDefined();
		expect(schema.expenseSplits).toBeDefined();
		expect(schema.complianceItems).toBeDefined();
		expect(schema.maintenanceLog).toBeDefined();
	});

	it('exports all pgEnum definitions', () => {
		expect(schema.memberRoleEnum).toBeDefined();
		expect(schema.expenseCategoryEnum).toBeDefined();
		expect(schema.complianceTypeEnum).toBeDefined();
	});

	it('exports all relation definitions', () => {
		expect(schema.usersRelations).toBeDefined();
		expect(schema.groupsRelations).toBeDefined();
		expect(schema.groupMembersRelations).toBeDefined();
		expect(schema.aircraftRelations).toBeDefined();
		expect(schema.bookingsRelations).toBeDefined();
		expect(schema.expensesRelations).toBeDefined();
		expect(schema.expenseSplitsRelations).toBeDefined();
		expect(schema.complianceItemsRelations).toBeDefined();
		expect(schema.maintenanceLogRelations).toBeDefined();
	});

	it('memberRoleEnum has correct values', () => {
		expect(schema.memberRoleEnum.enumValues).toEqual(['admin', 'member']);
	});

	it('expenseCategoryEnum has correct values', () => {
		expect(schema.expenseCategoryEnum.enumValues).toEqual([
			'fuel',
			'maintenance',
			'insurance',
			'hangar',
			'landing',
			'other',
		]);
	});

	it('complianceTypeEnum has correct values', () => {
		expect(schema.complianceTypeEnum.enumValues).toEqual([
			'arc',
			'annual',
			'insurance',
			'50hr',
			'ad',
			'other',
		]);
	});
});
