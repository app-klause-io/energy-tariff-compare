<script lang="ts">
	import { SignIn } from 'svelte-clerk/components';
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50">
	<div class="w-full max-w-md">
		<SignIn redirectUrl="/dashboard" signUpUrl="/signup" />
	</div>
</div>
