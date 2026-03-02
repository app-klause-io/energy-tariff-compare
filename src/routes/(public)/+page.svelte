<script lang="ts">
	import type { PropertyDetails, UsageHabits, Appliance } from '$lib/types/wizard';
	import type { ComparisonResult } from '$lib/types/tariff';
	import { DEFAULT_APPLIANCES } from '$lib/data/appliances';
	import { calculateConsumption } from '$lib/models/consumption';
	import { compareTariffsWithData } from '$lib/models/comparison';
	import { tick } from 'svelte';
	import { track } from '@vercel/analytics';
	import Button from '$lib/components/ui/button/button.svelte';
	import WizardStepper from '$lib/components/WizardStepper.svelte';
	import WizardNav from '$lib/components/WizardNav.svelte';
	import PropertyStep from '$lib/components/PropertyStep.svelte';
	import ApplianceStep from '$lib/components/ApplianceStep.svelte';
	import HabitsStep from '$lib/components/HabitsStep.svelte';
	import ResultsView from '$lib/components/ResultsView.svelte';

	let showWizard = $state(false);
	let showResults = $state(false);
	let step = $state(1);

	let property = $state<PropertyDetails>({
		type: null,
		bedrooms: 2,
		occupants: 2,
		region: null,
	});

	let appliances = $state<Appliance[]>(DEFAULT_APPLIANCES.map((a) => ({ ...a })));

	let habits = $state<UsageHabits>({
		pattern: null,
		overnightAppliances: false,
		flexibility: null,
	});

	let results = $state<ComparisonResult[]>([]);
	let annualKwh = $state(0);
	let dailyProfile = $state<number[]>([]);
	let isCalculating = $state(false);
	let calculationError = $state<string | null>(null);

	let canProceed = $derived.by(() => {
		if (step === 1) {
			return property.type !== null && property.region !== null;
		}
		if (step === 2) {
			return true;
		}
		if (step === 3) {
			return habits.pattern !== null && habits.flexibility !== null;
		}
		return false;
	});

	async function scrollToTop() {
		await tick();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function startWizard() {
		showWizard = true;
		showResults = false;
		scrollToTop();
		track('funnel_start');
	}

	function goBack() {
		if (step > 1) {
			step--;
			scrollToTop();
		}
	}

	function goNext() {
		if (step < 3 && canProceed) {
			track('funnel_step_complete', { step, region: property.region ?? undefined });
			step++;
			scrollToTop();
		}
	}

	async function calculateResults() {
		if (!property.region) return;

		isCalculating = true;
		calculationError = null;
		track('funnel_step_complete', { step: 3, region: property.region });

		try {
			const profile = calculateConsumption(property, appliances, habits);
			annualKwh = profile.annualKwh;
			dailyProfile = profile.dailyProfile;

			const response = await fetch(`/api/tariffs?region=${property.region}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch tariffs: ${response.status}`);
			}
			const data = await response.json();

			results = compareTariffsWithData(profile, data.tariffs);
			showResults = true;
			scrollToTop();

			track('funnel_results_viewed', {
				region: property.region,
				annualKwh: Math.round(profile.annualKwh),
				tariffCount: results.length,
				bestSupplier: results[0]?.tariff.supplier ?? 'unknown',
			});
		} catch {
			calculationError = 'Unable to calculate results. Please check your inputs and try again.';
			track('funnel_error', { step: 3, region: property.region });
		} finally {
			isCalculating = false;
		}
	}

	function resetWizard() {
		showWizard = false;
		showResults = false;
		scrollToTop();
		step = 1;
		property = {
			type: null,
			bedrooms: 2,
			occupants: 2,
			region: null,
		};
		appliances = DEFAULT_APPLIANCES.map((a) => ({ ...a }));
		habits = {
			pattern: null,
			overnightAppliances: false,
			flexibility: null,
		};
		results = [];
		annualKwh = 0;
		dailyProfile = [];
		calculationError = null;
	}
</script>

<svelte:head>
	<title
		>{showResults
			? 'Your Results — Best Energy Tariffs UK'
			: 'Best Energy Tariffs UK — Compare Cheap Electricity Deals 2026'}</title
	>
	<meta
		name="description"
		content={showResults
			? `Your personalised energy tariff comparison based on ${Math.round(annualKwh).toLocaleString()} kWh annual usage.`
			: 'Compare cheap energy tariffs UK for 2026. Find the best electricity deals from Octopus, British Gas, EDF, E.ON and more. Built for EV owners and heat pump homes. Free, no sign-up.'}
	/>
</svelte:head>

<div class="flex min-h-screen flex-col bg-white">
	<header
		class="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"
	>
		{#if showWizard}
			<button
				onclick={resetWizard}
				class="text-sm font-medium text-slate-500 hover:text-slate-700"
			>
				<svg
					class="mr-1 inline-block h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
				Back to home
			</button>
		{/if}
		<span class="text-xl font-bold text-emerald-600">Best Energy Tariffs</span>
		{#if showWizard}
			<div class="w-20"></div>
		{/if}
	</header>

	{#if !showWizard && !showResults}
		<main class="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<div
					class="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700"
				>
					Free, no sign-up needed
				</div>
				<h1 class="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
					Compare cheap energy tariffs
					<span class="text-emerald-600">in 2 minutes.</span>
				</h1>
				<p class="mt-6 text-lg leading-relaxed text-slate-500">
					Find the best electricity deals from Octopus, British Gas, EDF, E.ON and more. Built for
					EV owners, heat pump homes, and anyone tired of generic comparison sites. We estimate
					your actual usage and compare against live UK tariff rates.
				</p>
				<div class="mt-8">
					<Button size="lg" onclick={startWizard} class="px-8 text-base">
						Get Started
						<svg
							class="ml-2 h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</Button>
				</div>
				<p class="mt-4 text-sm text-slate-400">Takes about 2 minutes. No email required.</p>
			</div>
		</main>
	{:else if isCalculating}
		<main class="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
			<div class="text-center" role="status" aria-label="Calculating your results">
				<div
					class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"
				></div>
				<p class="mt-4 text-lg font-medium text-slate-700">Crunching your numbers...</p>
				<p class="mt-1 text-sm text-slate-500">Comparing tariffs for your usage profile</p>
			</div>
		</main>
	{:else if showResults}
		<main class="flex flex-1 flex-col">
			<ResultsView
				{results}
				{annualKwh}
				{dailyProfile}
				onReset={resetWizard}
				wizardSelections={{
					property,
					appliances: appliances.map((a) => ({ id: a.id, name: a.name, enabled: a.enabled })),
					habits,
				}}
			/>
		</main>
	{:else}
		<main class="flex flex-1 flex-col">
			<div class="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
				<WizardStepper currentStep={step} />

				{#if calculationError}
					<div class="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
						<div class="flex items-center gap-2">
							<svg
								class="h-5 w-5 flex-shrink-0 text-red-600"
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
							<p class="text-sm font-medium text-red-800">{calculationError}</p>
						</div>
					</div>
				{/if}

				{#if step === 1}
					<PropertyStep bind:property />
				{:else if step === 2}
					<ApplianceStep bind:appliances />
				{:else if step === 3}
					<HabitsStep bind:habits />
				{/if}
			</div>

			<div class="sticky bottom-0 mx-auto w-full max-w-2xl">
				<WizardNav
					currentStep={step}
					{canProceed}
					onBack={goBack}
					onNext={goNext}
					onResults={calculateResults}
				/>
			</div>
		</main>
	{/if}

	<footer class="border-t border-slate-200 px-4 py-8 text-center sm:px-6 lg:px-8">
		<p class="text-xs text-slate-400">
			&copy; {new Date().getFullYear()} Best Energy Tariffs. All rights reserved.
		</p>
	</footer>
</div>
