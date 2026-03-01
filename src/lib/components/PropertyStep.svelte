<script lang="ts">
	import type { PropertyType, UkRegion, PropertyDetails } from '$lib/types/wizard';
	import { UK_REGIONS } from '$lib/data/regions';

	interface Props {
		property: PropertyDetails;
	}

	let { property = $bindable() }: Props = $props();

	const propertyTypes: { value: PropertyType; label: string; icon: string }[] = [
		{ value: 'flat', label: 'Flat', icon: '\u{1F3E2}' },
		{ value: 'terrace', label: 'Terrace', icon: '\u{1F3D8}\u{FE0F}' },
		{ value: 'semi-detached', label: 'Semi-detached', icon: '\u{1F3E0}' },
		{ value: 'detached', label: 'Detached', icon: '\u{1F3E1}' },
	];

	const bedroomOptions = [1, 2, 3, 4, 5];
	const occupantOptions = [1, 2, 3, 4];

	function selectPropertyType(type: PropertyType) {
		property.type = type;
	}

	function selectBedrooms(count: number) {
		property.bedrooms = count;
	}

	function selectOccupants(count: number) {
		property.occupants = count;
	}

	function selectRegion(event: Event) {
		const target = event.target as HTMLSelectElement;
		property.region = (target.value || null) as UkRegion | null;
	}
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">What type of property?</h2>
		<p class="mt-1 text-sm text-slate-500">This helps us estimate your base energy usage.</p>
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each propertyTypes as pt (pt.value)}
				<button
					type="button"
					onclick={() => selectPropertyType(pt.value)}
					class="flex min-h-[80px] flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-colors duration-150
					{property.type === pt.value
						? 'border-emerald-600 bg-emerald-50 text-emerald-700'
						: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}"
					aria-pressed={property.type === pt.value}
				>
					<span class="text-2xl">{pt.icon}</span>
					<span class="mt-1.5 text-sm font-medium">{pt.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold text-slate-900">How many bedrooms?</h2>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each bedroomOptions as count (count)}
				<button
					type="button"
					onclick={() => selectBedrooms(count)}
					class="flex h-11 min-w-[48px] items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-150
					{property.bedrooms === count
						? 'bg-emerald-600 text-white'
						: 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
					aria-pressed={property.bedrooms === count}
				>
					{count}{count === 5 ? '+' : ''}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold text-slate-900">How many people live here?</h2>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each occupantOptions as count (count)}
				<button
					type="button"
					onclick={() => selectOccupants(count)}
					class="flex h-11 min-w-[48px] items-center justify-center rounded-full px-4 text-sm font-medium transition-colors duration-150
					{property.occupants === count
						? 'bg-emerald-600 text-white'
						: 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
					aria-pressed={property.occupants === count}
				>
					{count}{count === 4 ? '+' : ''}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold text-slate-900">Where do you live?</h2>
		<p class="mt-1 text-sm text-slate-500">
			Energy prices vary by region. Select your electricity region.
		</p>
		<select
			onchange={selectRegion}
			value={property.region ?? ''}
			class="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
			aria-label="Select your UK region"
		>
			<option value="" disabled>Select your region...</option>
			{#each UK_REGIONS as region (region.value)}
				<option value={region.value}>{region.label} — {region.hint}</option>
			{/each}
		</select>
	</div>
</div>
