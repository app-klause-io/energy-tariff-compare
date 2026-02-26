<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children, class: className = '' }: { children: Snippet; class?: string } = $props();
</script>

<h3 class="font-semibold leading-none tracking-tight {className}">
	{@render children()}
</h3>
