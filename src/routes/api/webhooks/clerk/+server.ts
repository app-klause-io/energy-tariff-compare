import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Webhook } from 'svix';
import { db } from '$lib/server/db';
import { users, groups, groupMembers } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '$lib/server/env';
import { logger } from '$lib/server/logger';

// Clerk sends webhook events when users/orgs are created/updated/deleted
// We sync this data to our Postgres for relational queries
export const POST: RequestHandler = async ({ request }) => {
	const svix_id = request.headers.get('svix-id');
	const svix_timestamp = request.headers.get('svix-timestamp');
	const svix_signature = request.headers.get('svix-signature');

	if (!svix_id || !svix_timestamp || !svix_signature) {
		throw error(400, 'Missing svix headers');
	}

	const body = await request.text();

	let evt: WebhookEvent;
	try {
		const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
		evt = wh.verify(body, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		logger.warn('Webhook signature verification failed', {
			error: err instanceof Error ? err.message : 'Unknown error',
		});
		throw error(400, 'Invalid webhook signature');
	}

	logger.info('Clerk webhook received', { eventType: evt.type });

	switch (evt.type) {
		case 'user.created':
		case 'user.updated': {
			const { id, email_addresses, first_name, last_name, image_url } = evt.data;
			const email = email_addresses[0]?.email_address ?? '';
			const name = [first_name, last_name].filter(Boolean).join(' ') || email;

			await db
				.insert(users)
				.values({
					clerkId: id,
					email,
					name,
					avatarUrl: image_url ?? null,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: { email, name, avatarUrl: image_url ?? null, updatedAt: new Date() },
				});
			break;
		}

		case 'user.deleted': {
			if (evt.data.id) {
				await db.delete(users).where(eq(users.clerkId, evt.data.id));
			}
			break;
		}

		case 'organization.created':
		case 'organization.updated': {
			const { id, name } = evt.data;
			await db
				.insert(groups)
				.values({
					clerkOrgId: id,
					name,
				})
				.onConflictDoUpdate({
					target: groups.clerkOrgId,
					set: { name, updatedAt: new Date() },
				});
			break;
		}

		case 'organizationMembership.created': {
			const { organization, public_user_data, role } = evt.data;
			const orgId = organization.id;
			const clerkUserId = public_user_data.user_id;

			const [group] = await db.select().from(groups).where(eq(groups.clerkOrgId, orgId));
			const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId));

			if (group && user) {
				await db.insert(groupMembers).values({
					groupId: group.id,
					userId: user.id,
					role: role === 'admin' ? 'admin' : 'member',
				});
			}
			break;
		}

		case 'organizationMembership.deleted': {
			const { organization, public_user_data } = evt.data;
			const orgId = organization.id;
			const clerkUserId = public_user_data.user_id;

			const [group] = await db.select().from(groups).where(eq(groups.clerkOrgId, orgId));
			const [user] = await db.select().from(users).where(eq(users.clerkId, clerkUserId));

			if (group && user) {
				await db
					.delete(groupMembers)
					.where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)));
			}
			break;
		}
	}

	logger.info('Clerk webhook processed', { eventType: evt.type });
	return json({ received: true });
};

// Clerk webhook event types
interface ClerkUserData {
	id: string;
	email_addresses: { email_address: string }[];
	first_name: string | null;
	last_name: string | null;
	image_url: string | null;
}

interface ClerkOrgData {
	id: string;
	name: string;
}

interface ClerkMembershipData {
	organization: { id: string };
	public_user_data: { user_id: string };
	role: string;
}

type WebhookEvent =
	| { type: 'user.created' | 'user.updated'; data: ClerkUserData }
	| { type: 'user.deleted'; data: { id?: string } }
	| { type: 'organization.created' | 'organization.updated'; data: ClerkOrgData }
	| {
			type: 'organizationMembership.created' | 'organizationMembership.deleted';
			data: ClerkMembershipData;
	  };
