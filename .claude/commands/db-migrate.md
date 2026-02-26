Generate and review a Drizzle database migration.

1. Run `pnpm db:generate` to generate a new migration from schema changes.
2. Review the generated SQL in `drizzle/` — check for destructive operations (DROP, ALTER column type).
3. If the migration looks correct, run `pnpm db:migrate` to apply it.
4. Commit the migration files to git.

Never edit generated migration files. If a migration is wrong, fix the schema and regenerate.
