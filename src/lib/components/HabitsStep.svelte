<script lang="ts">
	import type { UsagePattern, FlexibilityLevel, UsageHabits } from '$lib/types/wizard';

	interface Props {
		habits: UsageHabits;
	}

	let { habits = $bindable() }: Props = $props();

	const patterns: { value: UsagePattern; label: string; time: string; icon: string }[] = [
		{ value: 'morning', label: 'Morning', time: '7\u201310am', icon: '\u{1F305}' },
		{ value: 'daytime', label: 'Daytime / WFH', time: '10am\u20134pm', icon: '\u{2600}\u{FE0F}' },
		{ value: 'evening', label: 'Evening', time: '4\u20139pm', icon: '\u{1F307}' },
		{ value: 'night', label: 'Night owl', time: 'Overnight', icon: '\u{1F319}' },
	];

	const flexibilityOptions: { value: FlexibilityLevel; label: string; desc: string }[] = [
		{ value: 'low', label: 'Low', desc: 'I use energy when I need it' },
		{ value: 'medium', label: 'Medium', desc: 'I can shift some usage' },
		{ value: 'high', label: 'High', desc: 'I can shift most usage' },
	];

	function selectPattern(pattern: UsagePattern) {
		habits.pattern = pattern;
	}

	function selectFlexibility(level: FlexibilityLevel) {
		habits.flexibility = level;
	}
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">When do you use the most energy?</h2>
		<p class="mt-1 text-sm text-slate-500">
			This helps us match you with time-of-use tariffs that could save you money.
		</p>
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each patterns as p (p.value)}
				<button
					type="button"
					onclick={() => selectPattern(p.value)}
					class="flex min-h-[90px] flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-colors duration-150
					{habits.pattern === p.value
						? 'border-emerald-600 bg-emerald-50 text-emerald-700'
						: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}"
					aria-pressed={habits.pattern === p.value}
				>
					<span class="text-2xl">{p.icon}</span>
					<span class="mt-1.5 text-sm font-medium">{p.label}</span>
					<span class="mt-0.5 text-xs text-slate-400">{p.time}</span>
				</button>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold text-slate-900">Run appliances overnight?</h2>
		<p class="mt-1 text-sm text-slate-500">
			Washing machine, dishwasher, etc. on timers overnight.
		</p>
		<div class="mt-3 flex gap-3">
			<button
				type="button"
				onclick={() => {
					habits.overnightAppliances = true;
				}}
				class="flex h-11 min-w-[80px] items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-150
				{habits.overnightAppliances
					? 'bg-emerald-600 text-white'
					: 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
				aria-pressed={habits.overnightAppliances}
			>
				Yes
			</button>
			<button
				type="button"
				onclick={() => {
					habits.overnightAppliances = false;
				}}
				class="flex h-11 min-w-[80px] items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-150
				{!habits.overnightAppliances
					? 'bg-emerald-600 text-white'
					: 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
				aria-pressed={!habits.overnightAppliances}
			>
				No
			</button>
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold text-slate-900">How flexible is your energy usage?</h2>
		<p class="mt-1 text-sm text-slate-500">
			Higher flexibility means more savings with time-of-use tariffs.
		</p>
		<div class="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
			{#each flexibilityOptions as opt (opt.value)}
				<button
					type="button"
					onclick={() => selectFlexibility(opt.value)}
					class="flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors duration-150
					{habits.flexibility === opt.value
						? 'border-emerald-600 bg-emerald-50'
						: 'border-slate-200 bg-white hover:border-slate-300'}"
					aria-pressed={habits.flexibility === opt.value}
				>
					<div>
						<span class="text-sm font-medium text-slate-900">{opt.label}</span>
						<span class="block text-xs text-slate-500">{opt.desc}</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
