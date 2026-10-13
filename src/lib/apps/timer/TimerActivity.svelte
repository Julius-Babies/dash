<script lang="ts">
	import { Pause, Timer } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { formatDuration, timers } from './timers.svelte.ts';
</script>

{#if timers.list.length > 0}
	<ul class="contents">
		{#each timers.sorted as timer (timer.id)}
			<li
				class="mb-[2vw] flex h-14 items-center gap-3 rounded-full bg-black/40 py-2.5 pr-6 pl-4 backdrop-blur-xl transition-colors {timer.endsAt ===
				null
					? 'text-white/50'
					: ''}"
				animate:flip={{ duration: 400 }}
				transition:scale={{ duration: 300, start: 0.8 }}
			>
				{#if timer.endsAt === null}
					<Pause size={22} strokeWidth={1.5} />
				{:else}
					<Timer size={22} strokeWidth={1.5} />
				{/if}
				<span class="font-mono text-3xl font-extralight tracking-[-0.06em]">
					{formatDuration(timers.remaining(timer))}
				</span>
			</li>
		{/each}
	</ul>
{/if}
