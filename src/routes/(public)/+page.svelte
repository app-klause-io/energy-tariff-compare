<svelte:head>
	<title>Energy Tariff Compare — Find Your Cheapest Energy Deal</title>
	<meta
		name="description"
		content="Compare energy tariffs based on your actual usage. Built for EV owners, heat pump homes, and anyone tired of generic comparison sites."
	/>
</svelte:head>

<div class="flex min-h-screen flex-col bg-white">
	<header
		class="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"
	>
		<span class="text-xl font-bold text-emerald-600">Energy Tariff Compare</span>
	</header>

	<main class="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl text-center">
			<div
				class="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700"
			>
				Coming soon
			</div>
			<h1 class="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
				Find your cheapest energy tariff
				<span class="text-emerald-600">in 2 minutes.</span>
			</h1>
			<p class="mt-6 text-lg leading-relaxed text-slate-500">
				Built for EV owners, heat pump homes, and anyone tired of generic comparison sites. We
				estimate your actual usage profile and compare it against live tariff rates.
			</p>
			<p class="mt-8 text-sm text-slate-400">Full tool launching soon.</p>
		</div>
	</main>

	<footer class="border-t border-slate-200 px-4 py-8 text-center sm:px-6 lg:px-8">
		<p class="text-xs text-slate-400">
			&copy; {new Date().getFullYear()} Energy Tariff Compare. All rights reserved.
		</p>
	</footer>
</div>
