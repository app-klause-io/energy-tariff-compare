<script lang="ts">
	import { UserButton, OrganizationSwitcher } from 'svelte-clerk/components';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- Desktop: sidebar layout -->
<div class="flex h-screen bg-slate-50">
	<!-- Sidebar (desktop) -->
	<aside class="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
		<div class="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
			<span class="text-xl font-bold text-sky-600">Shared Wings</span>
		</div>

		<div class="px-4 py-4">
			<OrganizationSwitcher />
		</div>

		<nav class="flex-1 space-y-1 px-3 py-2">
			<!-- Nav items added as features are built -->
		</nav>

		<div class="border-t border-slate-200 p-4">
			<UserButton />
		</div>
	</aside>

	<!-- Main content area -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Top bar (mobile) -->
		<header
			class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden"
		>
			<span class="text-lg font-bold text-sky-600">Shared Wings</span>
			<div class="flex items-center gap-3">
				<OrganizationSwitcher />
				<UserButton />
			</div>
		</header>

		<!-- Page content -->
		<main class="flex-1 overflow-y-auto p-4 lg:p-8">
			{@render children()}
		</main>
	</div>
</div>
