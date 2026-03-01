<script lang="ts">
	import type { ComparisonResult } from '$lib/types/tariff';
	import Button from '$lib/components/ui/button/button.svelte';

	interface Props {
		results: ComparisonResult[];
		annualKwh: number;
		onReset: () => void;
	}

	let { results, annualKwh, onReset }: Props = $props();

	let bestResult = $derived(results[0]);
	let hasResults = $derived(results.length > 0);

	function formatCurrency(amount: number): string {
		return `£${Math.round(amount).toLocaleString()}`;
	}

	function formatKwh(kwh: number): string {
		return `${Math.round(kwh).toLocaleString()} kWh`;
	}

	function getTariffExplanation(result: ComparisonResult): string {
		const tariff = result.tariff;
		const breakdown = result.breakdown;

		// For flat tariffs
		if (tariff.type === 'flat') {
			return 'Standard flat-rate pricing — good for consistent usage throughout the day.';
		}

		// For ToU tariffs with breakdown
		if (breakdown.byTimePeriod && breakdown.byTimePeriod.length > 0 && annualKwh > 0) {
			const offPeak = breakdown.byTimePeriod.find(
				(p) => p.label === 'off-peak' || p.label === 'cheap',
			);
			if (offPeak) {
				const offPeakPercent = Math.round((offPeak.kwhUsed / annualKwh) * 100);
				return `You'd use ${offPeakPercent}% of your energy during cheaper off-peak hours.`;
			}
		}

		// Fallback generic explanations
		switch (tariff.type) {
			case 'economy7':
				return 'Cheaper overnight rate — ideal for storage heaters or overnight EV charging.';
			case 'go':
			case 'intelligent-go':
				return 'Super-cheap 4-6 hour overnight window — perfect for EV charging.';
			case 'cosy':
				return '3-rate structure with cheap overnight, standard daytime, peak evening.';
			case 'agile':
				return 'Rates vary every half-hour — best for flexible usage and smart automation.';
			default:
				return '';
		}
	}

	function getRankBadgeClass(index: number): string {
		if (index === 0) return 'bg-emerald-100 text-emerald-700';
		if (index === results.length - 1) return 'bg-slate-100 text-slate-500';
		return 'bg-slate-50 text-slate-600';
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
	{#if !hasResults}
		<!-- No results error state -->
		<div class="text-center">
			<div
				class="inline-block rounded-full bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700"
			>
				Error
			</div>
			<h1 class="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">No tariffs available</h1>
			<p class="mt-2 text-lg text-slate-500">
				We couldn't find any tariffs for your region. Please try again.
			</p>
			<div class="mt-8">
				<Button onclick={onReset}>Start Over</Button>
			</div>
		</div>
	{:else}
		<!-- Header -->
		<div class="text-center">
			<div
				class="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700"
			>
				Your Results
			</div>
			<h1 class="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
				We found your cheapest tariff
			</h1>
			<p class="mt-2 text-lg text-slate-500">
				Based on your estimated annual usage of <span class="font-semibold text-slate-700"
					>{formatKwh(annualKwh)}</span
				>
			</p>
		</div>

		<!-- Best Tariff Card -->
		<div
			class="mt-8 overflow-hidden rounded-lg border-2 border-emerald-500 bg-emerald-50 shadow-sm"
		>
			<div class="p-6">
				<div class="flex items-start justify-between">
					<div>
						<div
							class="inline-block rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
						>
							Cheapest
						</div>
						<h2 class="mt-3 text-2xl font-bold text-slate-900">{bestResult.tariff.name}</h2>
						<p class="mt-1 text-sm font-medium text-slate-600">{bestResult.tariff.supplier}</p>
					</div>
					<div class="text-right">
						<div class="text-3xl font-bold text-emerald-700">
							{formatCurrency(bestResult.annualCost)}
						</div>
						<div class="text-sm text-slate-500">per year</div>
					</div>
				</div>

				{#if bestResult.savingsVsWorst > 0}
					<div class="mt-4 rounded-md bg-white px-4 py-3">
						<p class="text-sm font-medium text-slate-900">
							Save <span class="font-bold text-emerald-600"
								>{formatCurrency(bestResult.savingsVsWorst)}/year</span
							> vs the most expensive option
						</p>
					</div>
				{/if}

				<p class="mt-4 text-sm text-slate-600">
					{getTariffExplanation(bestResult)}
				</p>

				<!-- ToU Breakdown for best tariff -->
				{#if bestResult.breakdown.byTimePeriod}
					<div class="mt-4 space-y-2">
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Usage breakdown
						</p>
						{#each bestResult.breakdown.byTimePeriod as period}
							<div class="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
								<span class="capitalize text-slate-700">{period.label}</span>
								<div class="text-right">
									<span class="font-medium text-slate-900">{formatCurrency(period.cost)}</span>
									<span class="ml-2 text-xs text-slate-500">({formatKwh(period.kwhUsed)})</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- All Tariffs List -->
		<div class="mt-8">
			<h3 class="text-lg font-semibold text-slate-900">All Tariffs Compared</h3>
			<p class="mt-1 text-sm text-slate-500">Ranked from cheapest to most expensive</p>

			<div class="mt-4 space-y-3">
				{#each results as result, index}
					<div
						class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
					>
						<div class="p-4">
							<div class="flex items-start justify-between">
								<div class="flex items-start gap-3">
									<div
										class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {getRankBadgeClass(
											index,
										)}"
									>
										<span class="text-sm font-bold">#{index + 1}</span>
									</div>
									<div>
										<h4 class="font-semibold text-slate-900">{result.tariff.name}</h4>
										<p class="text-sm text-slate-600">{result.tariff.supplier}</p>
										{#if index !== 0}
											<p class="mt-1 text-xs text-slate-500">
												{getTariffExplanation(result)}
											</p>
										{/if}
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-slate-900">
										{formatCurrency(result.annualCost)}
									</div>
									<div class="text-xs text-slate-500">per year</div>
									{#if result.savingsVsWorst > 0}
										<div class="mt-1 text-xs font-medium text-emerald-600">
											Save {formatCurrency(result.savingsVsWorst)}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="mt-8 flex justify-center">
			<Button variant="outline" size="lg" onclick={onReset}>
				<svg
					class="mr-1.5 h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Start Over
			</Button>
		</div>
	{/if}
</div>
