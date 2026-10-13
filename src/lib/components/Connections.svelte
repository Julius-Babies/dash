<script lang="ts">
	import type { Journey } from '#lib/server/vbb.ts';

	type Props = {
		from: string;
		to: string;
		journeys: Journey[] | null;
		now?: Date;
	};

	let { from, to, journeys, now }: Props = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Berlin'
	});

	const upcoming = $derived(
		(journeys ?? []).filter((journey) => !now || new Date(journey.departure) >= now).slice(0, 5)
	);

	function countdown(departure: string, now: Date) {
		const minutes = Math.round((new Date(departure).getTime() - now.getTime()) / 60_000);
		if (minutes < 1) return 'jetzt';
		if (minutes < 60) return `in ${minutes} min`;
		return `in ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
	}
</script>

<section
	class="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm"
>
	<h2 class="mb-3 text-sm font-medium tracking-wide text-white/60 uppercase">{from} → {to}</h2>

	{#if !journeys}
		<p class="m-auto text-sm text-white/60">Verbindungen gerade nicht verfügbar</p>
	{:else if upcoming.length === 0}
		<p class="m-auto text-sm text-white/60">Keine Verbindungen gefunden</p>
	{:else}
		<ul class="flex flex-1 flex-col justify-between">
			{#each upcoming as journey (journey.departure + journey.lines.map((l) => l.name).join())}
				<li class="flex items-center gap-4" class:opacity-50={journey.cancelled}>
					<span class="w-24 shrink-0 text-2xl tabular-nums" class:line-through={journey.cancelled}>
						{timeFormat.format(new Date(journey.departure))}
						{#if journey.delay > 0}
							<sup class="text-xs font-medium text-red-300">+{journey.delay}</sup>
						{/if}
					</span>

					<span class="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
						{#each journey.lines as line, i (i)}
							{#if i > 0}<span class="text-white/40">›</span>{/if}
							<span
								class="rounded-md bg-white/15 px-2 py-0.5 font-medium"
								style:color={line.fg}
								style:background-color={line.bg}
							>
								{line.name}
							</span>
						{/each}
						{#if journey.platform}
							<span class="ml-1 truncate text-white/60">Gl. {journey.platform}</span>
						{/if}
					</span>

					<span class="shrink-0 text-right text-sm">
						{#if journey.cancelled}
							<span class="font-medium text-red-300">Fällt aus</span>
						{:else}
							{#if now}<span class="block">{countdown(journey.departure, now)}</span>{/if}
							<span class="block text-white/60 tabular-nums">
								an {timeFormat.format(new Date(journey.arrival))}
							</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>
