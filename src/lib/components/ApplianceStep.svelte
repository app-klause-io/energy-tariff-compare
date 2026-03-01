<script lang="ts">
	import type { Appliance, ApplianceCategory } from '$lib/types/wizard';

	interface Props {
		appliances: Appliance[];
	}

	let { appliances = $bindable() }: Props = $props();

	const CATEGORY_CONFIG: { key: ApplianceCategory; label: string }[] = [
		{ key: 'heating', label: 'Heating & Hot Water' },
		{ key: 'transport', label: 'Transport' },
		{ key: 'generation', label: 'Generation' },
		{ key: 'kitchen', label: 'Kitchen & Laundry' },
		{ key: 'bathroom', label: 'Bathroom' },
		{ key: 'other', label: 'Other' },
	];

	let expandedCategories = $state<Set<ApplianceCategory>>(new Set(['heating', 'transport', 'generation', 'kitchen', 'bathroom', 'other']));

	let groupedAppliances = $derived.by(() => {
		const groups: { key: ApplianceCategory; label: string; items: Appliance[] }[] = [];
		for (const cat of CATEGORY_CONFIG) {
			const items = appliances.filter((a) => a.category === cat.key);
			if (items.length > 0) {
				groups.push({ key: cat.key, label: cat.label, items });
			}
		}
		return groups;
	});

	function toggleCategory(key: ApplianceCategory) {
		const next = new Set(expandedCategories);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		expandedCategories = next;
	}

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

	function enabledCountForCategory(key: ApplianceCategory): number {
		return appliances.filter((a) => a.category === key && a.enabled).length;
	}
</script>

<div>
	<h2 class="text-lg font-semibold text-slate-900">Any of these in your home?</h2>
	<p class="mt-1 text-sm text-slate-500">
		These high-usage appliances affect which tariff works best for you. Toggle any that apply.
	</p>

	<div class="mt-5 space-y-3">
		{#each groupedAppliances as group (group.key)}
			{@const isExpanded = expandedCategories.has(group.key)}
			{@const enabledCount = enabledCountForCategory(group.key)}
			<div class="rounded-xl border border-slate-200 bg-white">
				<button
					type="button"
					onclick={() => toggleCategory(group.key)}
					class="flex w-full items-center justify-between px-4 py-3"
					aria-expanded={isExpanded}
				>
					<div class="flex items-center gap-2">
						<span class="text-sm font-semibold text-slate-700">{group.label}</span>
						{#if enabledCount > 0}
							<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
								{enabledCount} selected
							</span>
						{/if}
					</div>
					<svg
						class="h-4 w-4 text-slate-400 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if isExpanded}
					<div class="border-t border-slate-100 px-3 pb-3 pt-2">
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{#each group.items as appliance (appliance.id)}
								<div
									class="rounded-lg border-2 transition-colors duration-150
									{appliance.enabled ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}"
								>
									<button
										type="button"
										onclick={() => toggleAppliance(appliance.id)}
										class="flex w-full items-center gap-3 p-3"
										aria-pressed={appliance.enabled}
										aria-label="Toggle {appliance.name}"
									>
										<span class="text-2xl">{appliance.icon}</span>
										<div class="flex-1 text-left">
											<span class="text-sm font-medium text-slate-900">{appliance.name}</span>
											{#if appliance.description}
												<span class="block text-xs text-slate-400">{appliance.description}</span>
											{/if}
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
										<div class="border-t border-emerald-200 px-3 pb-3 pt-2">
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
														aria-pressed={appliance.selectedSubOption === opt.value}
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
				{/if}
			</div>
		{/each}
	</div>
</div>
