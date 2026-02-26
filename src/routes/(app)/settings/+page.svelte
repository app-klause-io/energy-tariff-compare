<script lang="ts">
	import { UserProfile, OrganizationProfile } from 'svelte-clerk/components';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
</script>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Settings</h1>
	<p class="mt-1 text-sm text-slate-500">Manage your account and partnership group</p>

	<div class="mt-6 space-y-8">
		<Card>
			<CardHeader>
				<CardTitle>Your Profile</CardTitle>
			</CardHeader>
			<CardContent>
				<UserProfile />
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Partnership Group</CardTitle>
			</CardHeader>
			<CardContent>
				<OrganizationProfile />
			</CardContent>
		</Card>
	</div>
</div>
