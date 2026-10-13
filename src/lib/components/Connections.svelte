<script lang="ts">
	import { Bell } from '@lucide/svelte';
	import type { Journey } from '#lib/server/vbb.ts';

	type Props = {
		from: string;
		to: string;
		journeys: Journey[] | null;
		now?: Date;
		/** Journeys with an alarm set, keyed by id. */
		alarms: ReadonlyMap<string, Journey>;
		ontoggle: (journey: Journey) => void;
	};

	let { from, to, journeys, now, alarms, ontoggle }: Props = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Berlin'
	});

	const upcoming = $derived(
		(journeys ?? []).filter((journey) => !now || new Date(journey.departure) >= now).slice(0, 8)
	);

	function countdown(departure: string, now: Date) {
		const minutes = Math.round((new Date(departure).getTime() - now.getTime()) / 60_000);
		if (minutes < 1) return 'jetzt';
		if (minutes < 60) return `in ${minutes} min`;
		return `in ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
	}
</script>

<section class="panel">
	<h2 class="panel-title">{from} → {to}</h2>

	{#if !journeys}
		<p class="m-auto text-sm text-white/60">Verbindungen gerade nicht verfügbar</p>
	{:else if upcoming.length === 0}
		<p class="m-auto text-sm text-white/60">Keine Verbindungen gefunden</p>
	{:else}
		<ul class="-mx-3 flex flex-col gap-0.5">
			{#each upcoming as journey (journey.id)}
				{@const armed = alarms.has(journey.id)}
				<li class:opacity-50={journey.cancelled}>
					<button
						type="button"
						aria-pressed={armed}
						aria-label="Wecker für {timeFormat.format(new Date(journey.departure))} Uhr"
						class="flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-[5px] text-left leading-6 {armed
							? 'bg-white/10'
							: ''}"
						onclick={() => ontoggle(journey)}
					>
					<span class="flex shrink-0 items-baseline gap-1.5 tabular-nums">
						<span class="w-12" class:line-through={journey.cancelled}>
							{timeFormat.format(new Date(journey.departure))}
							{#if journey.delay > 0}
								<sup class="text-xs font-medium text-red-300">+{journey.delay}</sup>
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
						{#if armed}<Bell size={14} strokeWidth={1.75} class="text-amber-200" />{/if}
						{#if journey.cancelled}
							<span class="text-red-300">Fällt aus</span>
						{:else if now}
							{countdown(journey.departure, now)}
						{/if}
					</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
