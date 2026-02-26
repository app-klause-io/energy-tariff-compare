<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
</script>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
	<p class="mt-1 text-sm text-slate-500">Welcome back. Here's your partnership at a glance.</p>

	<div class="mt-6 grid gap-4 md:grid-cols-3">
		<Card>
			<CardHeader>
				<CardTitle>Next Booking</CardTitle>
				<CardDescription>Your upcoming slot</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-slate-500">No upcoming bookings.</p>
				<a href="/calendar" class="mt-2 block">
					<Button variant="outline" size="sm">Book a slot</Button>
				</a>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Balance</CardTitle>
				<CardDescription>Your share of expenses</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold text-slate-900">£0.00</p>
				<p class="mt-1 text-xs text-slate-500">All settled up</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Compliance</CardTitle>
				<CardDescription>Items due soon</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-slate-500">No items due in the next 90 days.</p>
			</CardContent>
		</Card>
	</div>

	<div class="mt-8">
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-slate-500">No recent activity. Activity from your partnership group will appear here.</p>
			</CardContent>
		</Card>
	</div>
</div>
