<script lang="ts">
	import { Bell } from '@lucide/svelte';
	import NumberFlow from '@number-flow/svelte';
	import { flip } from 'svelte/animate';
	import { fade, scale } from 'svelte/transition';
	import type { Journey } from '#lib/server/vbb.ts';

	type Props = {
		from: string;
		to: string;
		journeys: Journey[] | null;
		now?: Date;
		/** Journeys with an alarm set, keyed by id. */
		alarms: ReadonlyMap<string, Journey>;
		ontoggle: (journey: Journey) => void;
		/** Minutes before departure at which an alarm goes off. */
		alarmLead: number;
	};

	let { from, to, journeys, now, alarms, ontoggle, alarmLead }: Props = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Berlin'
	});

	const upcoming = $derived(
		(journeys ?? []).filter((journey) => !now || new Date(journey.departure) >= now).slice(0, 8)
	);

	function minutesUntil(departure: string, now: Date) {
		return Math.round((new Date(departure).getTime() - now.getTime()) / 60_000);
	}
</script>

<section class="panel">
	<header class="panel-title flex items-baseline justify-between gap-4">
		<h2>{from} → {to}</h2>
		<p class="truncate text-xs text-white/35">
			Antippen für Wecker · {alarmLead} min Fußweg eingeplant
		</p>
	</header>

	{#if !journeys}
		<p class="m-auto text-sm text-white/60">Verbindungen gerade nicht verfügbar</p>
	{:else if upcoming.length === 0}
		<p class="m-auto text-sm text-white/60">Keine Verbindungen gefunden</p>
	{:else}
		<ul class="-mx-3 flex flex-col">
			{#each upcoming as journey (journey.id)}
				{@const armed = alarms.has(journey.id)}
				<li
					class="transition-opacity duration-500"
					class:opacity-50={journey.cancelled}
					animate:flip={{ duration: 500 }}
					in:fade={{ duration: 500 }}
					out:fade={{ duration: 300 }}
				>
					<button
						type="button"
						aria-pressed={armed}
						aria-label="Wecker für {timeFormat.format(new Date(journey.departure))} Uhr"
						class="flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-[5px] text-left leading-6 transition-colors duration-300 {armed
							? 'bg-white/10'
							: ''}"
						onclick={() => ontoggle(journey)}
					>
					<span class="flex shrink-0 items-baseline gap-1.5 tabular-nums">
						<span class="w-12" class:line-through={journey.cancelled}>
							{timeFormat.format(new Date(journey.departure))}
							{#if journey.delay > 0}
								<sup class="text-xs font-medium text-red-300" transition:fade>+{journey.delay}</sup>
							{/if}
						</span>
						<span class="text-xs text-white/30">→</span>
						<span class="w-12 font-light text-white/60" class:line-through={journey.cancelled}>
							{timeFormat.format(new Date(journey.arrival))}
						</span>
					</span>

					<span class="flex min-w-0 flex-1 items-center gap-2 text-xs">
						{#each journey.lines as line, i (i)}
							{#if i > 0}<span class="text-white/30">›</span>{/if}
							<span
								class="rounded-full bg-white/15 px-2 py-0.5 leading-none font-medium"
								style:color={line.fg}
								style:background-color={line.bg}
							>
								{line.name}
							</span>
						{/each}
						{#if journey.platform}
							<span class="ml-1 truncate text-sm text-white/50">Gl. {journey.platform}</span>
						{/if}
					</span>

					<span class="flex shrink-0 items-center gap-2 text-right text-sm text-white/80">
						{#if armed}
							<span class="text-amber-200" transition:scale={{ duration: 250 }}>
								<Bell size={14} strokeWidth={1.75} />
							</span>
						{/if}
						{#if journey.cancelled}
							<span class="text-red-300">Fällt aus</span>
						{:else if now}
							{@const minutes = minutesUntil(journey.departure, now)}
							{#if minutes < 1}
								<span in:fade>jetzt</span>
							{:else}
								<span class="tabular-nums">
									in
									{#if minutes >= 60}
										<NumberFlow value={Math.floor(minutes / 60)} suffix=" h" />
									{/if}
									<NumberFlow value={minutes % 60} suffix=" min" />
								</span>
							{/if}
						{/if}
					</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
