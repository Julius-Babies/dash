<script lang="ts">
	import { Delete, Pencil, Trash2 } from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import type { AppHost } from '../types.ts';
	import { alarms, formatDays, formatTime, WEEKDAYS, type Alarm } from './alarms.svelte.ts';

	// Every app is handed the host; this one has no use for it.
	let {}: { host: AppHost } = $props();

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'];
	// hh mm
	const DIGITS = 4;
	const WORKDAYS = [1, 2, 3, 4, 5];

	// Typed digits fill the display from the right, like on a microwave.
	let entry = $state('');
	let days = $state(WORKDAYS);
	// The alarm being changed; a new one is set up while there is none.
	let editing = $state<string>();

	const display = $derived(entry.padStart(DIGITS, '0'));
	const hour = $derived(Number(display.slice(0, 2)));
	const minute = $derived(Number(display.slice(2)));
	const valid = $derived(entry.length > 0 && hour < 24 && minute < 60);

	function press(key: string) {
		entry = (entry + key).slice(0, DIGITS);
	}

	function toggleDay(day: number) {
		days = days.includes(day) ? days.filter((other) => other !== day) : [...days, day];
	}

	function reset() {
		entry = '';
		days = WORKDAYS;
		editing = undefined;
	}

	function save() {
		if (editing) alarms.update(editing, { hour, minute, days });
		else alarms.add({ hour, minute, days });
		reset();
	}

	function edit(alarm: Alarm) {
		editing = alarm.id;
		entry = formatTime(alarm).replace(':', '');
		days = alarm.days;
	}

	function remove(id: string) {
		if (editing === id) reset();
		alarms.remove(id);
	}
</script>

<div class="grid h-full grid-cols-[1fr_minmax(0,26rem)] gap-[5vw]">
	<section class="flex flex-col items-center justify-center gap-5">
		<output
			class="font-mono text-7xl font-extralight tracking-[-0.06em] transition-colors {entry.length >
				0 && !valid
				? 'text-red-300'
				: ''}"
			aria-label="Uhrzeit"
		>
			{#each display as digit, i (i)}
				{#if i === 2}<span class="-mx-[0.14em] text-white/30">:</span>{/if}<span
					class={i < DIGITS - entry.length ? 'text-white/30' : ''}>{digit}</span
				>
			{/each}
		</output>

		<div class="flex gap-2" role="group" aria-label="Wochentage">
			{#each WEEKDAYS as { day, label } (day)}
				{@const on = days.includes(day)}
				<button
					type="button"
					aria-pressed={on}
					class="size-13 cursor-pointer rounded-full transition-colors {on
						? 'bg-white font-medium text-black'
						: 'bg-white/10 text-white/60 active:bg-white/30'}"
					onclick={() => toggleDay(day)}
				>
					{label}
				</button>
			{/each}
		</div>

		<div class="grid grid-cols-3 gap-3">
			{#each KEYS as key (key)}
				<button
					type="button"
					class="h-16 w-28 cursor-pointer rounded-2xl bg-white/10 text-3xl font-light transition-colors active:bg-white/30"
					onclick={() => press(key)}
				>
					{key}
				</button>
			{/each}
			<button
				type="button"
				aria-label="Ziffer löschen"
				class="flex h-16 w-28 cursor-pointer items-center justify-center rounded-2xl bg-white/5 transition-colors active:bg-white/30"
				onclick={() => (entry = entry.slice(0, -1))}
			>
				<Delete size={30} strokeWidth={1.25} />
			</button>

			<div class="col-span-3 mt-3 flex gap-3">
				{#if editing}
					<button
						type="button"
						class="h-16 flex-1 cursor-pointer rounded-2xl bg-white/10 text-xl transition-colors active:bg-white/30"
						onclick={reset}
					>
						Abbrechen
					</button>
				{/if}
				<button
					type="button"
					disabled={!valid}
					class="h-16 flex-1 cursor-pointer rounded-2xl bg-white text-xl font-medium text-black transition-opacity disabled:cursor-default disabled:opacity-25"
					onclick={save}
				>
					{editing ? 'Speichern' : 'Hinzufügen'}
				</button>
			</div>
		</div>
	</section>

	<!-- Scrolls by touch, so a swipe here must not drag the drawer. -->
	<section class="flex min-h-0 flex-col" data-no-drag>
		<h2 class="mb-4 text-sm text-white/50">Wecker</h2>

		{#if alarms.list.length === 0}
			<p class="m-auto text-sm text-white/40">Keine Wecker</p>
		{:else}
			<ul class="-mr-4 flex touch-pan-y flex-col gap-3 overflow-y-auto pr-4">
				{#each alarms.sorted as alarm (alarm.id)}
					<li
						class="flex items-center gap-3 rounded-3xl py-4 pr-4 pl-6 transition-colors {editing ===
						alarm.id
							? 'bg-white/15'
							: 'bg-white/5'}"
						animate:flip={{ duration: 400 }}
						transition:fade={{ duration: 250 }}
					>
						<div class="mr-auto min-w-0 transition-opacity {alarm.enabled ? '' : 'opacity-40'}">
							<p class="font-mono text-4xl font-extralight tracking-[-0.06em]">
								{formatTime(alarm)}
							</p>
							<p class="truncate text-sm text-white/50">{formatDays(alarm.days)}</p>
						</div>

						<button
							type="button"
							role="switch"
							aria-checked={alarm.enabled}
							aria-label="Wecker {formatTime(alarm)}"
							class="flex h-14 w-16 shrink-0 cursor-pointer items-center"
							onclick={() => alarms.toggle(alarm.id)}
						>
							<span
								class="flex h-9 w-16 items-center rounded-full p-1 transition-colors {alarm.enabled
									? 'bg-white/60'
									: 'bg-white/15'}"
							>
								<span
									class="size-7 rounded-full bg-black transition-transform {alarm.enabled
										? 'translate-x-7'
										: 'opacity-60'}"
								></span>
							</span>
						</button>
						<button
							type="button"
							aria-label="Bearbeiten"
							class="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
							onclick={() => edit(alarm)}
						>
							<Pencil size={22} strokeWidth={1.5} />
						</button>
						<button
							type="button"
							aria-label="Löschen"
							class="flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-red-300 transition-colors active:bg-white/30"
							onclick={() => remove(alarm.id)}
						>
							<Trash2 size={22} strokeWidth={1.5} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
