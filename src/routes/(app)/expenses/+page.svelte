<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
</script>

<div>
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Expenses</h1>
			<p class="mt-1 text-sm text-slate-500">Track and split shared costs</p>
		</div>
		<Button>Log expense</Button>
	</div>

	<div class="mt-6 grid gap-4 md:grid-cols-3">
		<Card>
			<CardHeader>
				<CardTitle>Total this month</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold text-slate-900">£0.00</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>You owe</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold text-green-600">£0.00</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Owed to you</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold text-sky-600">£0.00</p>
			</CardContent>
		</Card>
	</div>
</div>
