<script lang="ts">
	import { AlarmClock } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';
	import { alarms, formatTime } from './alarms.svelte.ts';
</script>

{#if alarms.upcoming.length > 0}
	<ul class="contents">
		{#each alarms.upcoming as { alarm } (alarm.id)}
			<li
				class="mb-[2vw] flex h-14 items-center gap-3 rounded-full bg-black/40 pr-6 pl-4 backdrop-blur-xl"
				animate:flip={{ duration: 400 }}
				transition:scale={{ duration: 300, start: 0.8 }}
			>
				<AlarmClock size={22} strokeWidth={1.5} />
				<span class="font-mono text-3xl font-extralight tracking-[-0.06em]">
					{formatTime(alarm)}
				</span>
			</li>
		{/each}
	</ul>
{/if}
