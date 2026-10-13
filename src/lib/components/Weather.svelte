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

	type Props = { place: string; weather: Weather | null; now?: Date };

	let { place, weather, now }: Props = $props();

	const HOUR = 60 * 60 * 1000;
	const TEMP_HEIGHT = 64;
	const RAIN_HEIGHT = 28;
	// Headroom for the direct labels above the highest and below the lowest point.
	const LABEL_SPACE = 16;
	// A drizzle shouldn't fill the whole band: the scale spans at least this many mm.
	const MIN_RAIN_SCALE = 2;
	const PAST = 0.3;

	const uid = $props.id();

	const hourFormat = new Intl.DateTimeFormat('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Berlin'
	});
	const dayFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });
	const mmFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

	let width = $state(520);
	let hovered = $state<number>();

	const hours = $derived(weather?.hourly ?? []);
	const band = $derived(width / Math.max(hours.length, 1));
	const center = (i: number) => (i + 0.5) * band;

	const current = $derived(now ? hours.findLastIndex((hour) => hour.time <= now.getTime()) : -1);
	// Each hour sits at the centre of its band, so the current time is offset by half a band.
	const nowX = $derived(
		now && current >= 0 ? center(current + (now.getTime() - hours[current].time) / HOUR) : undefined
	);
	const shown = $derived(hours[hovered ?? current] ?? hours[0]);

	const temps = $derived(hours.map((hour) => hour.temperature));
	const warmest = $derived(temps.indexOf(Math.max(...temps)));
	const coldest = $derived(temps.indexOf(Math.min(...temps)));
	const tempY = $derived.by(() => {
		const min = temps[coldest];
		const range = Math.max(temps[warmest] - min, 1);
		return (t: number) =>
			LABEL_SPACE + (1 - (t - min) / range) * (TEMP_HEIGHT - 2 * LABEL_SPACE);
	});
	// Catmull-Rom spline through the hourly points, written as cubic Béziers.
	const line = $derived.by(() => {
		const points = hours.map((hour, i) => [center(i), tempY(hour.temperature)]);
		const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];
		let d = `M${points[0]}`;
		for (let i = 0; i < points.length - 1; i++) {
			const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
			d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2}`;
		}
		return d;
	});
	const area = $derived(`${line}V${TEMP_HEIGHT}H${center(0)}Z`);
	// Interpolated so the marker sits on the line, not on the last full hour.
	const nowY = $derived.by(() => {
		if (nowX === undefined) return undefined;
		const next = hours[current + 1] ?? hours[current];
		const progress = (now!.getTime() - hours[current].time) / HOUR;
		const t = hours[current].temperature;
		return tempY(t + (next.temperature - t) * progress);
	});

	const rainScale = $derived(
		Math.max(MIN_RAIN_SCALE, ...hours.map((hour) => hour.precipitation))
	);

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

	function hover(event: PointerEvent & { currentTarget: HTMLElement }) {
		const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
		hovered = Math.min(hours.length - 1, Math.max(0, Math.floor(x / band)));
	}
</script>

<section class="panel">
	<h2 class="panel-title">{place}</h2>

	{#if !weather || hours.length === 0}
		<p class="m-auto text-sm text-white/60">Wetter gerade nicht verfügbar</p>
	{:else}
		<div class="flex flex-1 flex-col justify-between gap-4">
			<figure>
				<figcaption class="mb-3 flex items-baseline gap-3 text-sm text-white/50 tabular-nums">
					<span class="text-2xl font-light text-white">{Math.round(shown.temperature)}°</span>
					<span>
						{hovered === undefined && current >= 0 ? 'Jetzt' : hourFormat.format(shown.time)}
					</span>
					<span class="ml-auto">
						{mmFormat.format(shown.precipitation)} mm · {shown.probability} %
					</span>
				</figcaption>

				<div
					class="relative"
					role="img"
					aria-label="Temperatur und Niederschlag heute, stündlich"
					bind:clientWidth={width}
					onpointermove={hover}
					onpointerleave={() => (hovered = undefined)}
				>
					<div class="mb-2 flex text-white/70">
						{#each hours as hour, i (hour.time)}
							{#if i % 3 === 1}
								{@const Icon = icon(hour.code, hour.isDay)}
								<span
									class="flex justify-center"
									style:width="{band * 3}px"
									style:opacity={i < current ? PAST : 1}
								>
									<Icon size={18} strokeWidth={1.25} />
								</span>
							{/if}
						{/each}
					</div>

					<svg {width} height={TEMP_HEIGHT} class="block overflow-visible">
						<defs>
							<linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="white" stop-opacity="0.16" />
								<stop offset="1" stop-color="white" stop-opacity="0" />
							</linearGradient>
							<clipPath id="{uid}-past">
								<rect x="0" y="-8" width={nowX ?? 0} height={TEMP_HEIGHT + 8} />
							</clipPath>
							<clipPath id="{uid}-future">
								<rect x={nowX ?? 0} y="-8" {width} height={TEMP_HEIGHT + 8} />
							</clipPath>
						</defs>
						{#each ['past', 'future'] as part (part)}
							<g clip-path="url(#{uid}-{part})" opacity={part === 'past' ? PAST : 1}>
								<path d={area} fill="url(#{uid}-fill)" />
								<path
									d={line}
									fill="none"
									stroke-width="1.5"
									stroke-linecap="round"
									class="stroke-white/80"
								/>
							</g>
						{/each}
						{#each [...new Set([warmest, coldest])] as i (i)}
							<text
								x={center(i)}
								y={tempY(temps[i]) + (i === warmest ? -8 : 16)}
								text-anchor={i === 0 ? 'start' : i === hours.length - 1 ? 'end' : 'middle'}
								class="fill-white/50 text-[11px] tabular-nums"
								opacity={i < current ? 0.6 : 1}
							>
								{Math.round(temps[i])}°
							</text>
						{/each}
						{#if nowX !== undefined && nowY !== undefined}
							<circle cx={nowX} cy={nowY} r="8" class="fill-white/15" />
							<circle cx={nowX} cy={nowY} r="3" class="fill-white" />
						{/if}
					</svg>

					<svg {width} height={RAIN_HEIGHT} class="mt-1 block">
						{#each hours as hour, i (hour.time)}
							{@const h = Math.max((hour.precipitation / rainScale) * RAIN_HEIGHT, 3)}
							{#if hour.precipitation > 0}
								<rect
									x={center(i) - 2}
									y={RAIN_HEIGHT - h}
									width="4"
									height={h}
									rx="2"
									class="fill-sky-300/70"
									opacity={i < current ? PAST : 1}
								/>
							{/if}
						{/each}
					</svg>

					{#if hovered !== undefined}
						<div
							class="pointer-events-none absolute top-0 bottom-6 w-px bg-white/20"
							style:left="{center(hovered)}px"
						></div>
					{/if}

					<div class="mt-2 flex text-[11px] text-white/35 tabular-nums">
						{#each hours as hour, i (hour.time)}
							{#if i % 3 === 0}
								<span
									class="text-center"
									style:width="{band}px"
									style:margin-right="{band * 2}px"
									style:opacity={i < current ? 0.6 : 1}
								>
									{hourFormat.format(hour.time).slice(0, 2)}
								</span>
							{/if}
						{/each}
					</div>
				</div>
			</figure>

			<ul class="grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
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
