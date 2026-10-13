<script lang="ts">
	import {
		Cloud,
		CloudDrizzle,
		CloudFog,
		CloudLightning,
		CloudMoon,
		CloudRain,
		CloudSnow,
		CloudSun,
		Moon,
		Sun
	} from '@lucide/svelte';
	import type { Weather } from '#lib/server/weather.ts';

	type Props = { place: string; weather: Weather | null };

	let { place, weather }: Props = $props();

	const hourFormat = new Intl.DateTimeFormat('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Berlin'
	});
	const dayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });
	const mmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

	// WMO weather interpretation codes, see https://open-meteo.com/en/docs
	function icon(code: number, isDay = true) {
		if (code === 0) return isDay ? Sun : Moon;
		if (code <= 2) return isDay ? CloudSun : CloudMoon;
		if (code === 3) return Cloud;
		if (code <= 48) return CloudFog;
		if (code <= 57) return CloudDrizzle;
		if (code <= 67) return CloudRain;
		if (code <= 77) return CloudSnow;
		if (code <= 82) return CloudRain;
		if (code <= 86) return CloudSnow;
		return CloudLightning;
	}
</script>

<section class="panel">
	<h2 class="panel-title">{place}</h2>

	{#if !weather}
		<p class="m-auto text-sm text-white/60">Wetter gerade nicht verfügbar</p>
	{:else}
		<div class="flex flex-1 flex-col justify-between gap-6">
			<ul class="grid grid-cols-6 text-center">
				{#each weather.hourly as hour (hour.time)}
					{@const Icon = icon(hour.code, hour.isDay)}
					<li class="flex flex-col items-center gap-2.5">
						<span class="text-xs text-white/50 tabular-nums">{hourFormat.format(hour.time)}</span>
						<Icon size={28} strokeWidth={1.25} />
						<span class="text-xl leading-none font-light">{Math.round(hour.temperature)}°</span>
						<span class="text-xs tabular-nums {hour.precipitation > 0 ? 'text-sky-200' : 'text-white/30'}">
							{hour.precipitation} %
						</span>
					</li>
				{/each}
			</ul>

			<ul class="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
				{#each weather.daily as day (day.time)}
					{@const Icon = icon(day.code)}
					<li class="flex items-center gap-3">
						<Icon size={30} strokeWidth={1.25} class="shrink-0" />
						<span class="min-w-0 text-sm leading-snug">
							<span class="block truncate text-white/50">{dayFormat.format(day.time)}</span>
							<span class="block">
								{Math.round(day.max)}° <span class="text-white/50">/ {Math.round(day.min)}°</span>
							</span>
							<span class="block text-xs {day.precipitation > 0 ? 'text-sky-200' : 'text-white/30'}">
								{mmFormat.format(day.precipitation)} mm
							</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
