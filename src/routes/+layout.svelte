<script lang="ts">
	import '../app.css';
	import { ClerkProvider } from 'svelte-clerk/components';
	import { env } from '$env/dynamic/public';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<ClerkProvider publishableKey={env.PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''}>
	{@render children()}
</ClerkProvider>
