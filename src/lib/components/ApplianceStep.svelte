<script lang="ts">
	import type { Appliance } from '$lib/types/wizard';

	interface Props {
		appliances: Appliance[];
	}

	let { appliances = $bindable() }: Props = $props();

	function toggleAppliance(id: string) {
		const index = appliances.findIndex((a) => a.id === id);
		if (index === -1) return;
		const appliance = appliances[index];
		appliances[index] = {
			...appliance,
			enabled: !appliance.enabled,
			selectedSubOption: !appliance.enabled ? appliance.subOptions?.value : undefined,
		};
	}

	function selectSubOption(id: string, value: string) {
		const index = appliances.findIndex((a) => a.id === id);
		if (index === -1) return;
		appliances[index] = { ...appliances[index], selectedSubOption: value };
	}
</script>

<div>
	<h2 class="text-lg font-semibold text-slate-900">Any of these in your home?</h2>
	<p class="mt-1 text-sm text-slate-500">
		These high-usage appliances affect which tariff works best for you. Toggle any that apply.
	</p>

	<div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each appliances as appliance (appliance.id)}
			<div
				class="rounded-xl border-2 transition-colors duration-150
				{appliance.enabled ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}"
			>
				<button
					type="button"
					onclick={() => toggleAppliance(appliance.id)}
					class="flex w-full items-center gap-3 p-4"
					aria-pressed={appliance.enabled}
				>
					<span class="text-2xl">{appliance.icon}</span>
					<div class="flex-1 text-left">
						<span class="text-sm font-medium text-slate-900">{appliance.name}</span>
						<span class="block text-xs text-slate-500">
							{appliance.annualKwhEstimate > 0
								? '+'
								: ''}{appliance.annualKwhEstimate.toLocaleString()}
							kWh/yr
						</span>
					</div>
					<div
						class="flex h-6 w-11 items-center rounded-full px-0.5 transition-colors duration-150
						{appliance.enabled ? 'bg-emerald-600' : 'bg-slate-300'}"
						aria-hidden="true"
					>
						<div
							class="h-5 w-5 rounded-full bg-white shadow transition-transform duration-150
							{appliance.enabled ? 'translate-x-5' : 'translate-x-0'}"
						></div>
					</div>
				</button>

				{#if appliance.enabled && appliance.subOptions}
					<div class="border-t border-emerald-200 px-4 pb-4 pt-3">
						<p class="mb-2 text-xs font-medium text-slate-700">{appliance.subOptions.label}</p>
						<div class="flex flex-wrap gap-2">
							{#each appliance.subOptions.options as opt (opt.value)}
								<button
									type="button"
									onclick={() => selectSubOption(appliance.id, opt.value)}
									class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150
									{appliance.selectedSubOption === opt.value
										? 'bg-emerald-600 text-white'
										: 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
