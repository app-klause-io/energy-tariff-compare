<script lang="ts">
	import { SignedIn, SignedOut } from 'svelte-clerk/components';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-screen flex-col">
	<header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
		<span class="text-xl font-bold text-sky-600">Shared Wings</span>
		<div class="flex items-center gap-4">
			<SignedOut>
				<a href="/login" class="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</a>
				<a href="/signup">
					<Button>Get started</Button>
				</a>
			</SignedOut>
			<SignedIn>
				<a href="/dashboard">
					<Button>Go to dashboard</Button>
				</a>
			</SignedIn>
		</div>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center px-4 text-center">
		<h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
			Aircraft partnership management,
			<span class="text-sky-600">without the spreadsheets.</span>
		</h1>
		<p class="mt-6 max-w-xl text-lg text-slate-500">
			Book slots, track expenses, split costs, and stay on top of ARC renewals — all in one place.
			Built for UK co-ownership groups of 2-6 people.
		</p>
		<div class="mt-10">
			<a href="/signup">
				<Button size="lg">Get started</Button>
			</a>
		</div>
	</main>
</div>
