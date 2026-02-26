<script lang="ts">
	import { SignUp } from 'svelte-clerk/components';
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50">
	<div class="w-full max-w-md">
		<SignUp redirectUrl="/dashboard" signInUrl="/login" />
	</div>
</div>
