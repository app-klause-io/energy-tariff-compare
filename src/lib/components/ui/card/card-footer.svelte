<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, class: className = '' }: { children: Snippet; class?: string } = $props();
</script>

<div class="flex items-center p-6 pt-0 {className}">
	{@render children()}
</div>
