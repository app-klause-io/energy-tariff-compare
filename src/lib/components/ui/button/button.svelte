<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		children: Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		children,
		class: className = '',
		...restProps
	}: Props = $props();

	const baseClasses =
		'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50';

	const variants: Record<string, string> = {
		default: 'bg-sky-600 text-white shadow hover:bg-sky-700',
		destructive: 'bg-red-500 text-white shadow-sm hover:bg-red-600',
		outline: 'border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900',
		secondary: 'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200',
		ghost: 'hover:bg-slate-100 hover:text-slate-900',
		link: 'text-sky-600 underline-offset-4 hover:underline',
	};

	const sizes: Record<string, string> = {
		default: 'h-9 px-4 py-2',
		sm: 'h-8 rounded-md px-3 text-xs',
		lg: 'h-10 rounded-md px-8',
		icon: 'h-9 w-9',
	};
</script>

<button class="{baseClasses} {variants[variant]} {sizes[size]} {className}" {...restProps}>
	{@render children()}
</button>
