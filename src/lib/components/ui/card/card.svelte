<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="rounded-xl border border-slate-200 bg-white text-slate-950 shadow {className}">
	{@render children()}
</div>
