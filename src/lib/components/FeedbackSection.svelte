<script lang="ts">
	import type { PropertyDetails, UsageHabits } from '$lib/types/wizard';

	interface Props {
		bestTariff: string;
		annualCost: number;
		wizardSelections: {
			property: PropertyDetails;
			appliances: { id: string; name: string; enabled: boolean }[];
			habits: UsageHabits;
		};
	}

	let { bestTariff, annualCost, wizardSelections }: Props = $props();

	let rating = $state<'thumbs_up' | 'thumbs_down' | null>(null);
	let showDetails = $state(false);
	let comment = $state('');
	let suggestion = $state('');
	let currentProvider = $state('');
	let wouldShare = $state<boolean | null>(null);
	let email = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let submitError = $state(false);

	const providers = [
		'Octopus Energy',
		'British Gas',
		'EDF',
		'E.ON',
		'Scottish Power',
		'OVO Energy',
		'Shell Energy',
		'Other',
	];

	function selectRating(value: 'thumbs_up' | 'thumbs_down') {
		rating = value;
		showDetails = true;
	}

	async function submitFeedback() {
		if (!rating || submitting) return;

		submitting = true;
		submitError = false;

		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					rating,
					comment: comment || undefined,
					suggestion: suggestion || undefined,
					current_provider: currentProvider || undefined,
					would_share: wouldShare,
					email: email || undefined,
					wizard_selections: wizardSelections,
					best_tariff: bestTariff,
					annual_cost: annualCost,
				}),
			});

			if (response.ok) {
				submitted = true;
			} else {
				submitError = true;
			}
		} catch {
			submitError = true;
		} finally {
			submitting = false;
		}
	}
</script>

<div class="mt-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
	<div class="p-6">
		{#if submitted}
			<div class="text-center py-4">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
					<svg
						class="h-6 w-6 text-emerald-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<p class="mt-3 text-lg font-semibold text-slate-900">Thanks for your feedback!</p>
				<p class="mt-1 text-sm text-slate-500">It helps us make this tool better.</p>
			</div>
		{:else}
			<h3 class="text-lg font-semibold text-slate-900">How was your experience?</h3>
			<p class="mt-1 text-sm text-slate-500">Your feedback helps us improve</p>

			<!-- Thumbs buttons -->
			<div class="mt-4 flex gap-3">
				<button
					onclick={() => selectRating('thumbs_up')}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors {rating ===
					'thumbs_up'
						? 'border-emerald-500 bg-emerald-50 text-emerald-700'
						: 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}"
					aria-label="Thumbs up"
					aria-pressed={rating === 'thumbs_up'}
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
						/>
					</svg>
					Good
				</button>
				<button
					onclick={() => selectRating('thumbs_down')}
					class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors {rating ===
					'thumbs_down'
						? 'border-red-400 bg-red-50 text-red-700'
						: 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}"
					aria-label="Thumbs down"
					aria-pressed={rating === 'thumbs_down'}
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
						/>
					</svg>
					Could be better
				</button>
			</div>

			<!-- Expanded details -->
			{#if showDetails}
				<div class="mt-5 space-y-4">
					<!-- Comment -->
					<div>
						<label for="feedback-comment" class="block text-sm font-medium text-slate-700">
							Any comments?
						</label>
						<textarea
							id="feedback-comment"
							bind:value={comment}
							rows={2}
							placeholder="Tell us what you think..."
							class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						></textarea>
					</div>

					<!-- Current provider -->
					<div>
						<label for="feedback-provider" class="block text-sm font-medium text-slate-700">
							Which energy provider are you currently with?
						</label>
						<select
							id="feedback-provider"
							bind:value={currentProvider}
							class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						>
							<option value="">Select provider...</option>
							{#each providers as provider (provider)}
								<option value={provider}>{provider}</option>
							{/each}
						</select>
					</div>

					<!-- Would share -->
					<div>
						<span class="block text-sm font-medium text-slate-700">
							Would you share this tool with a friend?
						</span>
						<div class="mt-2 flex gap-2">
							<button
								onclick={() => (wouldShare = true)}
								class="rounded-md px-4 py-2 text-sm font-medium transition-colors {wouldShare ===
								true
									? 'bg-emerald-600 text-white'
									: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}"
							>
								Yes
							</button>
							<button
								onclick={() => (wouldShare = false)}
								class="rounded-md px-4 py-2 text-sm font-medium transition-colors {wouldShare ===
								false
									? 'bg-slate-600 text-white'
									: 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}"
							>
								No
							</button>
						</div>
					</div>

					<!-- Appliance suggestion -->
					<div>
						<label for="feedback-suggestion" class="block text-sm font-medium text-slate-700">
							Suggest an appliance we should add
						</label>
						<input
							id="feedback-suggestion"
							type="text"
							bind:value={suggestion}
							placeholder="e.g. Hot tub, pool pump..."
							class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						/>
					</div>

					<!-- Email notification -->
					<div>
						<label for="feedback-email" class="block text-sm font-medium text-slate-700">
							Get notified when we add more providers
						</label>
						<input
							id="feedback-email"
							type="email"
							bind:value={email}
							placeholder="you@example.com"
							class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
						/>
					</div>

					<!-- Error message -->
					{#if submitError}
						<p class="text-sm text-red-600">Something went wrong. Please try again.</p>
					{/if}

					<!-- Submit -->
					<button
						onclick={submitFeedback}
						disabled={submitting}
						class="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
					>
						{submitting ? 'Sending...' : 'Send Feedback'}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
