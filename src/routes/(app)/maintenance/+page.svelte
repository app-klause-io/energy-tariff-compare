<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
</script>

<div>
	<h1 class="text-2xl font-bold text-slate-900">Maintenance & Compliance</h1>
	<p class="mt-1 text-sm text-slate-500">Track ARC renewals, annuals, insurance, and maintenance work</p>

	<div class="mt-6 grid gap-4 md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Compliance Tracker</CardTitle>
				<CardDescription>ARC, Annual, Insurance, 50hr checks</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-slate-500">No compliance items yet. Add your aircraft to get started.</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Maintenance Log</CardTitle>
				<CardDescription>Record of all work performed</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-sm text-slate-500">No maintenance records yet.</p>
			</CardContent>
		</Card>
	</div>
</div>
