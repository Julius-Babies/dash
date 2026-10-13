<script lang="ts">
	import { Delete, Pause, Play, Trash2 } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { AppHost } from '../types.ts';
	import { formatDuration, timers } from './timers.svelte.ts';

	let { host }: { host: AppHost } = $props();

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];
	// hh mm ss
	const DIGITS = 6;

	// Typed digits fill the display from the right, like on a microwave.
	let entry = $state('');

	const display = $derived(entry.padStart(DIGITS, '0'));
	const duration = $derived(
		(Number(display.slice(0, 2)) * 3600 + Number(display.slice(2, 4)) * 60 + Number(display.slice(4))) *
			1000
	);

	function press(key: string) {
		// Leading zeros would only use up digits.
		entry = (entry + key).replace(/^0+/, '').slice(0, DIGITS);
	}

	function start() {
		timers.add(duration);
		entry = '';
		host.goHome();
	}
</script>

<div class="grid h-full grid-cols-[1fr_minmax(0,26rem)] gap-[5vw]">
	<section class="flex flex-col items-center justify-center gap-6">
		<output class="font-mono text-7xl font-extralight tracking-[-0.06em]" aria-label="Dauer">
			{#each display as digit, i (i)}
				{#if i > 0 && i % 2 === 0}<span class="-mx-[0.14em] text-white/30">:</span>{/if}<span
					class={i < DIGITS - entry.length ? 'text-white/30' : ''}>{digit}</span
				>
			{/each}
		</output>

		<div class="grid grid-cols-3 gap-3">
			{#each KEYS as key (key)}
				<button
					type="button"
					class="h-18 w-28 cursor-pointer rounded-2xl bg-white/10 text-3xl font-light transition-colors active:bg-white/30"
					onclick={() => press(key)}
				>
					{key}
				</button>
			{/each}
			<button
				type="button"
				aria-label="Ziffer löschen"
				class="flex h-18 w-28 cursor-pointer items-center justify-center rounded-2xl bg-white/5 transition-colors active:bg-white/30"
				onclick={() => (entry = entry.slice(0, -1))}
			>
				<Delete size={30} strokeWidth={1.25} />
			</button>

			<button
				type="button"
				disabled={duration === 0}
				class="col-span-3 mt-3 h-18 cursor-pointer rounded-2xl bg-white text-xl font-medium text-black transition-opacity disabled:cursor-default disabled:opacity-25"
				onclick={start}
			>
				Starten
			</button>
		</div>
	</section>

	<!-- Scrolls by touch, so a swipe here must not drag the drawer. -->
	<section class="flex min-h-0 flex-col" data-no-drag>
		<h2 class="mb-4 text-sm text-white/50">Aktive Timer</h2>

		{#if timers.list.length === 0}
			<p class="m-auto text-sm text-white/40">Keine aktiven Timer</p>
		{:else}
			<ul class="-mr-4 flex touch-pan-y flex-col gap-3 overflow-y-auto pr-4">
				{#each timers.sorted as timer (timer.id)}
					{@const paused = timer.endsAt === null}
					<li
						class="flex items-center gap-3 rounded-3xl bg-white/5 py-4 pr-4 pl-6"
						animate:flip={{ duration: 400 }}
						transition:fade={{ duration: 250 }}
					>
						<div class="mr-auto min-w-0">
							<p
								class="font-mono text-4xl font-extralight tracking-[-0.06em] transition-colors {paused
									? 'text-white/50'
									: ''}"
							>
								{formatDuration(timers.remaining(timer))}
							</p>
							<p class="text-sm text-white/40">
								{paused ? 'Pausiert' : 'Läuft'} · {formatDuration(timer.duration)}
							</p>
						</div>

						<button
							type="button"
							aria-label={paused ? 'Fortsetzen' : 'Pausieren'}
							class="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
							onclick={() => timers.toggle(timer.id)}
						>
							{#if paused}
								<Play size={26} strokeWidth={1.5} />
							{:else}
								<Pause size={26} strokeWidth={1.5} />
							{/if}
						</button>
						<button
							type="button"
							aria-label="Löschen"
							class="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-red-300 transition-colors active:bg-white/30"
							onclick={() => timers.remove(timer.id)}
						>
							<Trash2 size={24} strokeWidth={1.5} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
