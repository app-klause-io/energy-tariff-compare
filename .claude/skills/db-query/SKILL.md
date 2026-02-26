---
name: db-query
description: Write Drizzle ORM queries for Shared Wings. Use when building load functions, form actions, or any database access. Covers scoping, transactions, and conflict detection.
---

# Drizzle Query Patterns

All database queries go through Drizzle ORM. Never use raw SQL.

## Always Scope by groupId

Every query in `(app)` routes must filter by the user's groupId to enforce data isolation:

```typescript
// CORRECT — scoped
const bookings = await db.select()
  .from(bookingsTable)
  .where(and(
    eq(bookingsTable.groupId, locals.groupId),
    eq(bookingsTable.cancelled, false),
  ));

// WRONG — unscoped, returns data from all groups
const bookings = await db.select().from(bookingsTable);
```

## Transactions for Multi-Step Mutations

Use `db.transaction()` when a mutation needs atomicity:

```typescript
// Booking creation with conflict detection — must be atomic
const result = await db.transaction(async (tx) => {
  // Check for conflicts inside the transaction
  const conflicts = await tx.select()
    .from(bookingsTable)
    .where(and(
      eq(bookingsTable.aircraftId, aircraftId),
      eq(bookingsTable.cancelled, false),
      lte(bookingsTable.startTime, endTime),
      gte(bookingsTable.endTime, startTime),
    ));

  if (conflicts.length > 0) {
    throw new Error('BOOKING_CONFLICT');
  }

  // Insert inside the same transaction
  const [booking] = await tx.insert(bookingsTable)
    .values({ aircraftId, userId, groupId, startTime, endTime, notes })
    .returning();

  return booking;
});
```

## Null Checks After Lookups

Always check if a record exists before using it:

```typescript
const [aircraft] = await db.select()
  .from(aircraftTable)
  .where(and(
    eq(aircraftTable.id, aircraftId),
    eq(aircraftTable.groupId, locals.groupId), // scope check
  ));

if (!aircraft) {
  throw error(404, 'Aircraft not found');
}
```

## Relations (Eager Loading)

Use Drizzle's relational queries for joins:

```typescript
const bookings = await db.query.bookings.findMany({
  where: and(
    eq(bookingsTable.groupId, locals.groupId),
    eq(bookingsTable.cancelled, false),
  ),
  with: {
    aircraft: true,
    user: true,
  },
});
```

## Index-Aware Queries

The schema has indexes on these patterns — use them:

- `bookings(aircraftId, startTime, endTime)` — conflict detection
- `bookings(groupId, cancelled, startTime)` — calendar date range queries
- `complianceItems(aircraftId, dueDate)` — compliance lookups
- All FK columns have individual indexes
