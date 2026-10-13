<script lang="ts">
	import { Moon } from '@lucide/svelte';
	import { scale } from 'svelte/transition';
	import { night } from '#lib/night.svelte.ts';
</script>

{#if night.active}
	<div
		role="img"
		aria-label="Nachtmodus aktiv"
		class="mb-[2vw] flex size-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-xl"
		transition:scale={{ duration: 300, start: 0.8 }}
	>
		<Moon size={22} strokeWidth={1.5} />
	</div>
{/if}
