<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
</script>

<svelte:head>
	<title>Error — Energy Tariff Compare</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-white">
	<header
		class="sticky top-0 z-50 flex h-16 items-center justify-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"
	>
		<span class="text-xl font-bold text-emerald-600">Energy Tariff Compare</span>
	</header>

	<main class="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-md text-center">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
				<svg
					class="h-8 w-8 text-emerald-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h1 class="mt-6 text-3xl font-bold text-slate-900">
				{$page.status === 404 ? 'Page not found' : 'Something went wrong'}
			</h1>
			<p class="mt-3 text-base text-slate-500">
				{#if $page.status === 404}
					The page you're looking for doesn't exist or has been moved.
				{:else}
					{$page.error?.message || 'An unexpected error occurred. Please try again.'}
				{/if}
			</p>
			<div class="mt-8">
				<Button size="lg" onclick={() => (window.location.href = '/')}>
					<svg
						class="mr-1.5 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
					Back to home
				</Button>
			</div>
		</div>
	</main>

	<footer class="border-t border-slate-200 px-4 py-8 text-center sm:px-6 lg:px-8">
		<p class="text-xs text-slate-400">
			&copy; {new Date().getFullYear()} Energy Tariff Compare. All rights reserved.
		</p>
	</footer>
</div>
