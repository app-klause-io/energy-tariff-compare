<script lang="ts">
	interface Props {
		currentStep: number;
	}

	let { currentStep }: Props = $props();

	const steps = [
		{ number: 1, label: 'Property' },
		{ number: 2, label: 'Appliances' },
		{ number: 3, label: 'Habits' },
	];
</script>

<nav aria-label="Wizard progress" class="mb-8 w-full px-2">
	<ol class="flex items-center justify-between">
		{#each steps as step, i (step.number)}
			<li class="flex items-center {i < steps.length - 1 ? 'flex-1' : ''}">
				<div class="flex flex-col items-center">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-150
						{currentStep > step.number
							? 'bg-emerald-600 text-white'
							: currentStep === step.number
								? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
								: 'bg-slate-200 text-slate-500'}"
						aria-current={currentStep === step.number ? 'step' : undefined}
					>
						{#if currentStep > step.number}
							<svg
								class="h-4 w-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="3"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							{step.number}
						{/if}
					</div>
					<span
						class="mt-1.5 text-xs font-medium
						{currentStep >= step.number ? 'text-emerald-700' : 'text-slate-400'}"
					>
						{step.label}
					</span>
				</div>
				{#if i < steps.length - 1}
					<div
						class="mx-2 mt-[-1rem] h-0.5 flex-1 transition-colors duration-150
						{currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'}"
					></div>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
