import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { groups, users } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { userId: clerkUserId, orgId } = locals.auth;
	if (!clerkUserId) throw redirect(302, '/login');

	const [dbUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.clerkId, clerkUserId))
		.limit(1);

	let groupId: string | null = null;
	if (orgId) {
		const [group] = await db
			.select({ id: groups.id })
			.from(groups)
			.where(eq(groups.clerkOrgId, orgId))
			.limit(1);
		groupId = group?.id ?? null;
	}

	return { userId: dbUser?.id ?? null, groupId };
};
