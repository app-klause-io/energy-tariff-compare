<script lang="ts">
	import { page } from '$app/stores';
	import { UserButton, OrganizationSwitcher } from 'svelte-clerk/components';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: '📊' },
		{ href: '/calendar', label: 'Calendar', icon: '📅' },
		{ href: '/expenses', label: 'Expenses', icon: '💷' },
		{ href: '/maintenance', label: 'Maintenance', icon: '🔧' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' }
	];

	let mobileMenuOpen = $state(false);
</script>

<!-- Desktop: sidebar layout -->
<div class="flex h-screen bg-slate-50">
	<!-- Sidebar (desktop) -->
	<aside class="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
		<div class="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
			<span class="text-xl font-bold text-sky-600">SkyLedger</span>
		</div>

		<div class="px-4 py-4">
			<OrganizationSwitcher />
		</div>

		<nav class="flex-1 space-y-1 px-3 py-2">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
						{$page.url.pathname.startsWith(item.href)
							? 'bg-sky-50 text-sky-700'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
				>
					<span>{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="border-t border-slate-200 p-4">
			<UserButton />
		</div>
	</aside>

	<!-- Main content area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Top bar (mobile) -->
		<header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
			<span class="text-lg font-bold text-sky-600">SkyLedger</span>
			<div class="flex items-center gap-3">
				<OrganizationSwitcher />
				<UserButton />
			</div>
		</header>

		<!-- Page content -->
		<main class="flex-1 overflow-y-auto p-4 lg:p-8">
			{@render children()}
		</main>

		<!-- Bottom nav (mobile) -->
		<nav class="flex border-t border-slate-200 bg-white lg:hidden">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors
						{$page.url.pathname.startsWith(item.href)
							? 'text-sky-600'
							: 'text-slate-400 hover:text-slate-600'}"
				>
					<span class="text-lg">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>
	</div>
</div>
