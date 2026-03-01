<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';

	interface Props {
		currentStep: number;
		canProceed: boolean;
		onBack: () => void;
		onNext: () => void;
		onResults: () => void;
	}

	let { currentStep, canProceed, onBack, onNext, onResults }: Props = $props();

	let isLastStep = $derived(currentStep === 3);
</script>

<div class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
	{#if currentStep > 1}
		<Button variant="outline" onclick={onBack}>
			<svg
				class="mr-1.5 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</Button>
	{:else}
		<div></div>
	{/if}

	{#if isLastStep}
		<Button disabled={!canProceed} onclick={onResults}>
			See My Results
			<svg
				class="ml-1.5 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</Button>
	{:else}
		<Button disabled={!canProceed} onclick={onNext}>
			Next
			<svg
				class="ml-1.5 h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</Button>
	{/if}
</div>
