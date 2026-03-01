<script lang="ts">
	import type { ComparisonResult } from '$lib/types/tariff';
	import type { PropertyDetails, UsageHabits } from '$lib/types/wizard';
	import Button from '$lib/components/ui/button/button.svelte';
	import FeedbackSection from '$lib/components/FeedbackSection.svelte';

	interface Props {
		results: ComparisonResult[];
		annualKwh: number;
		dailyProfile: number[];
		onReset: () => void;
		wizardSelections?: {
			property: PropertyDetails;
			appliances: { id: string; name: string; enabled: boolean }[];
			habits: UsageHabits;
		};
	}

	let { results, annualKwh, dailyProfile, onReset, wizardSelections }: Props = $props();

	let bestResult = $derived(results[0]);

	interface TimePeriodBreakdown {
		label: string;
		kwh: number;
		percent: number;
	}

	let consumptionBreakdown = $derived.by(() => {
		if (!dailyProfile || dailyProfile.length !== 48) return null;

		// Sum proportions for each time-of-day period
		const periods = [
			{ label: 'Overnight (00:00–07:00)', startSlot: 0, endSlot: 14 },
			{ label: 'Morning (07:00–10:00)', startSlot: 14, endSlot: 20 },
			{ label: 'Daytime (10:00–16:00)', startSlot: 20, endSlot: 32 },
			{ label: 'Evening (16:00–00:00)', startSlot: 32, endSlot: 48 },
		];

		const breakdown: TimePeriodBreakdown[] = periods.map((p) => {
			let proportion = 0;
			for (let i = p.startSlot; i < p.endSlot; i++) {
				proportion += dailyProfile[i];
			}
			const kwh = proportion * annualKwh;
			return {
				label: p.label,
				kwh,
				percent: proportion * 100,
			};
		});

		// Day vs night split: Day = 07:00–21:00 (slots 14-42), Night = rest
		let dayProportion = 0;
		for (let i = 14; i < 42; i++) {
			dayProportion += dailyProfile[i];
		}
		const dayKwh = dayProportion * annualKwh;
		const nightKwh = annualKwh - dayKwh;

		return {
			periods: breakdown,
			dayKwh,
			nightKwh,
			dayPercent: dayProportion * 100,
			nightPercent: (1 - dayProportion) * 100,
		};
	});

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
		if (breakdown.byTimePeriod && breakdown.byTimePeriod.length > 0) {
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
	<div class="mt-8 overflow-hidden rounded-lg border-2 border-emerald-500 bg-emerald-50 shadow-sm">
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
					{#each bestResult.breakdown.byTimePeriod as period (period.label)}
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

	<!-- Consumption Breakdown -->
	{#if consumptionBreakdown}
		<div class="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
			<div class="p-6">
				<h3 class="text-lg font-semibold text-slate-900">Your Estimated Consumption</h3>
				<p class="mt-1 text-sm text-slate-500">
					{formatKwh(annualKwh)} per year, broken down by time of day
				</p>

				<div class="mt-4 space-y-2">
					{#each consumptionBreakdown.periods as period (period.label)}
						<div class="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
							<span class="text-slate-700">{period.label}</span>
							<div class="text-right">
								<span class="font-medium text-slate-900">{formatKwh(period.kwh)}</span>
								<span class="ml-2 text-xs text-slate-500">({Math.round(period.percent)}%)</span>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-4 border-t border-slate-200 pt-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Day vs Night split
					</p>
					<div class="mt-2 flex gap-4">
						<div class="flex-1 rounded bg-amber-50 px-3 py-2 text-center">
							<div class="text-sm font-medium text-amber-800">Day (07:00–21:00)</div>
							<div class="mt-1 text-lg font-bold text-amber-700">
								{formatKwh(consumptionBreakdown.dayKwh)}
							</div>
							<div class="text-xs text-amber-600">
								{Math.round(consumptionBreakdown.dayPercent)}%
							</div>
						</div>
						<div class="flex-1 rounded bg-indigo-50 px-3 py-2 text-center">
							<div class="text-sm font-medium text-indigo-800">Night (21:00–07:00)</div>
							<div class="mt-1 text-lg font-bold text-indigo-700">
								{formatKwh(consumptionBreakdown.nightKwh)}
							</div>
							<div class="text-xs text-indigo-600">
								{Math.round(consumptionBreakdown.nightPercent)}%
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- All Tariffs List -->
	<div class="mt-8">
		<h3 class="text-lg font-semibold text-slate-900">All Tariffs Compared</h3>
		<p class="mt-1 text-sm text-slate-500">Ranked from cheapest to most expensive</p>

		<div class="mt-4 space-y-3" role="list" aria-label="All tariffs ranked by cost">
			{#each results as result, index (result.tariff.name)}
				<div
					class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
					role="listitem"
				>
					<div class="p-4">
						<div class="flex items-start justify-between">
							<div class="flex items-start gap-3">
								<div
									class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {getRankBadgeClass(
										index,
									)}"
									aria-hidden="true"
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

	<!-- Feedback -->
	{#if wizardSelections}
		<FeedbackSection
			bestTariff={bestResult.tariff.name}
			annualCost={bestResult.annualCost}
			{wizardSelections}
		/>
	{/if}

	<!-- Action Buttons -->
	<div class="mt-8 flex justify-center">
		<Button variant="outline" size="lg" onclick={onReset}>
			<svg
				class="mr-1.5 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
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
</div>
