<script lang="ts">
	import { BellRing } from '@lucide/svelte';
	import NumberFlow, { NumberFlowGroup } from '@number-flow/svelte';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Connections from '#lib/components/Connections.svelte';
	import Drawer from '#lib/components/Drawer.svelte';
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

	// `?disable_fullscreen` keeps taps from switching to fullscreen, e.g. while developing.
	const fullscreenDisabled = $derived(page.url.searchParams.has('disable_fullscreen'));

	function ontap() {
		if (!fullscreenDisabled && !document.fullscreenElement) {
			document.documentElement.requestFullscreen();
		}
		unlockSound();
	}

	// How far up a swipe on the image has to travel to open the drawer.
	const SWIPE_OPEN = 40;

	let drawerOpen = $state(false);
	let swipeStart: number | undefined;

	function onswipemove(event: PointerEvent) {
		if (swipeStart === undefined || swipeStart - event.clientY < SWIPE_OPEN) return;
		swipeStart = undefined;
		drawerOpen = true;
	}

	// Minutes before departure at which an alarm goes off: the walk to the station.
	const ALARM_LEAD = 12;

	const ALARM_STORAGE = 'dash:alarms';

	const alarms = new SvelteMap<string, Journey>();
	let ringing = $state<Journey>();
	let audioContext: AudioContext | undefined;
	let alarmBuffer: Promise<AudioBuffer> | undefined;
	let alarmSource: AudioBufferSourceNode | undefined;
	// Keeps the first save from wiping the stored alarms before they were read.
	let restored = $state(false);

	onMount(() => {
		try {
			const stored: Journey[] = JSON.parse(localStorage.getItem(ALARM_STORAGE) ?? '[]');
			for (const journey of stored) {
				if (new Date(journey.departure).getTime() > Date.now()) alarms.set(journey.id, journey);
			}
		} catch {
			// Unreadable storage only costs the saved alarms.
		}
		restored = true;
	});

	$effect(() => {
		if (restored) localStorage.setItem(ALARM_STORAGE, JSON.stringify([...alarms.values()]));
	});

	function getAudioContext() {
		const context = (audioContext ??= new AudioContext());
		alarmBuffer ??= fetch('/alarm.mp3')
			.then((res) => res.arrayBuffer())
			.then((data) => context.decodeAudioData(data));
		return context;
	}

	// Unless the browser is set up to allow autoplay, an audio context stays suspended until
	// it is resumed from a tap. Resuming makes no sound itself, and an alarm that is already
	// ringing silently becomes audible.
	function unlockSound() {
		getAudioContext()
			.resume()
			.catch(() => {});
	}

	async function startSound() {
		const context = getAudioContext();
		// Without a tap so far this stays pending; the source below then waits for `unlockSound`.
		context.resume().catch(() => {});
		const buffer = await alarmBuffer!;
		if (!ringing || alarmSource) return;
		alarmSource = new AudioBufferSourceNode(context, { buffer, loop: true });
		alarmSource.connect(context.destination);
		alarmSource.start();
	}

	function stopSound() {
		alarmSource?.stop();
		alarmSource = undefined;
	}

	function toggleAlarm(journey: Journey) {
		if (!alarms.delete(journey.id)) alarms.set(journey.id, journey);
	}

	function dismissAlarm() {
		ringing = undefined;
		stopSound();
	}

	$effect(() => {
		if (!now) return;
		for (const [id, stored] of alarms) {
			// Follow delays: prefer the refreshed journey over the one the alarm was set on.
			const journey = data.journeys?.find((j) => j.id === id) ?? stored;
			if (now.getTime() < new Date(journey.departure).getTime() - ALARM_LEAD * 60_000) continue;
			alarms.delete(id);
			ringing = journey;
			startSound().catch((error) => console.error('Failed to play alarm sound', error));
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

<svelte:document onclick={ontap} />

<main
	class="grid h-dvh grid-rows-[auto_1fr] text-white md:grid-cols-[1fr_minmax(0,38rem)] md:grid-rows-1"
>
	<section class="pointer-events-none relative flex flex-col justify-end p-[5vw] select-none">
		<button
			type="button"
			aria-label="Apps öffnen"
			class="pointer-events-auto absolute inset-0 cursor-pointer touch-none"
			onclick={() => (drawerOpen = true)}
			onpointerdown={(event) => (swipeStart = event.clientY)}
			onpointermove={onswipemove}
			onpointerup={() => (swipeStart = undefined)}
			onpointercancel={() => (swipeStart = undefined)}
		></button>
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
			alarmLead={ALARM_LEAD}
		/>
	</aside>
</main>

<Drawer bind:open={drawerOpen} {now} />

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
