<script lang="ts">
	import { BellRing } from '@lucide/svelte';
	import { alerts } from '#lib/alerts.svelte.ts';
</script>

{#if alerts.current}
	<div
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="alert-title"
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-12 bg-black/80 text-white backdrop-blur-2xl"
	>
		<BellRing size={72} strokeWidth={1} class="animate-pulse" />
		<div class="text-center">
			<h2 id="alert-title" class="text-6xl font-light">{alerts.current.title}</h2>
			{#if alerts.current.detail}
				<p class="mt-5 text-2xl font-light text-white/70">{alerts.current.detail}</p>
			{/if}
		</div>
		<button
			type="button"
			class="cursor-pointer rounded-full bg-white px-20 py-5 text-2xl font-medium text-black"
			onclick={alerts.dismiss}
		>
			OK
		</button>
	</div>
{/if}
