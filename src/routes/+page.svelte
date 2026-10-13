<script lang="ts">
	import { BellRing } from '@lucide/svelte';
	import NumberFlow, { NumberFlowGroup } from '@number-flow/svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import Connections from '#lib/components/Connections.svelte';
	import Weather from '#lib/components/Weather.svelte';
	import type { Journey } from '#lib/server/vbb.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
	const TWO_DIGITS = { minimumIntegerDigits: 2 };
	const dateFormat = new Intl.DateTimeFormat('de-DE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	// Set on the client only: the server doesn't know the visitor's time zone.
	let now = $state<Date>();

	$effect(() => {
		now = new Date();
		const interval = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(interval);
	});

	function enterFullscreen() {
		if (!document.fullscreenElement) document.documentElement.requestFullscreen();
	}

	// How long before departure an alarm goes off.
	const ALARM_LEAD = 12 * 60_000;

	const alarms = new SvelteMap<string, Journey>();
	let ringing = $state<Journey>();
	let sound: HTMLAudioElement | undefined;

	function toggleAlarm(journey: Journey) {
		if (alarms.delete(journey.id)) return;
		alarms.set(journey.id, journey);

		// Browsers only let a page start sound on its own once it was started from a tap,
		// so play it silently now to be allowed to ring later.
		if (!sound) {
			const audio = (sound = Object.assign(new Audio('/alarm.mp3'), { loop: true, muted: true }));
			audio
				.play()
				.then(() => {
					if (!ringing) audio.pause();
					audio.muted = false;
				})
				.catch(() => (audio.muted = false));
		}
	}

	function dismissAlarm() {
		ringing = undefined;
		sound?.pause();
	}

	$effect(() => {
		if (!now) return;
		for (const [id, stored] of alarms) {
			// Follow delays: prefer the refreshed journey over the one the alarm was set on.
			const journey = data.journeys?.find((j) => j.id === id) ?? stored;
			if (now.getTime() < new Date(journey.departure).getTime() - ALARM_LEAD) continue;
			alarms.delete(id);
			ringing = journey;
			if (sound) {
				sound.muted = false;
				sound.currentTime = 0;
				sound.play().catch(() => {});
			}
		}
	});

	$effect(() => {
		const interval = setInterval(() => invalidate('app:live'), 60_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Dash</title>
</svelte:head>

<svelte:document onclick={enterFullscreen} />

<main
	class="grid h-dvh grid-rows-[auto_1fr] text-white md:grid-cols-[1fr_minmax(0,38rem)] md:grid-rows-1"
>
	<section class="flex flex-col justify-end p-[5vw] select-none">
		{#if now}
			<time
				datetime={now.toISOString()}
				class="-my-[0.25em] block text-[clamp(5rem,13vw,11rem)] font-mono leading-none font-extralight tracking-[-0.09em]"
			>
				<NumberFlowGroup>
					<!-- The colon sits in a full-width cell; pull its neighbours in. -->
					<NumberFlow value={now.getHours()} format={TWO_DIGITS} /><span class="-mx-[0.14em]"
						>:</span
					><NumberFlow value={now.getMinutes()} format={TWO_DIGITS} />
				</NumberFlowGroup>
			</time>
			<p class="mt-[1.5vw] text-[clamp(1.25rem,2.2vw,2rem)] leading-tight font-light text-white/80">
				{dateFormat.format(now)}
			</p>
		{/if}
	</section>

	<aside
		class="grid min-h-0 grid-rows-2 divide-y divide-white/10 border-white/10 bg-black/35 backdrop-blur-2xl max-md:border-t md:border-l"
	>
		<Weather place="Potsdam" weather={data.weather} {now} />
		<Connections
			from="Golm"
			to="Griebnitzsee"
			journeys={data.journeys}
			{now}
			{alarms}
			ontoggle={toggleAlarm}
		/>
	</aside>
</main>

{#if ringing}
	<div
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="alarm-title"
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-12 bg-black/80 text-white backdrop-blur-2xl"
	>
		<BellRing size={72} strokeWidth={1} class="animate-pulse" />
		<div class="text-center">
			<h2 id="alarm-title" class="text-6xl font-light">Zeit zu gehen</h2>
			<p class="mt-5 text-2xl font-light text-white/70">
				{ringing.lines.map((line) => line.name).join(' › ')} um
				{timeFormat.format(new Date(ringing.departure))}
				{#if ringing.platform}· Gleis {ringing.platform}{/if}
			</p>
		</div>
		<button
			type="button"
			class="cursor-pointer rounded-full bg-white px-20 py-5 text-2xl font-medium text-black"
			onclick={dismissAlarm}
		>
			OK
		</button>
	</div>
{/if}
