<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Connections from '#lib/components/Connections.svelte';
	import Weather from '#lib/components/Weather.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
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

	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else document.documentElement.requestFullscreen();
	}

	$effect(() => {
		const interval = setInterval(() => invalidate('app:live'), 60_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Dash</title>
</svelte:head>

<svelte:document onclick={toggleFullscreen} />

<main
	class="grid h-dvh grid-rows-[auto_1fr] text-white md:grid-cols-[1fr_minmax(0,38rem)] md:grid-rows-1"
>
	<section class="flex flex-col justify-end p-[5vw] select-none">
		{#if now}
			<time
				datetime={now.toISOString()}
				class="block text-[clamp(5rem,13vw,11rem)] font-mono leading-none font-extralight tracking-tighter"
			>
				{timeFormat.format(now)}
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
		<Connections from="Golm" to="Griebnitzsee" journeys={data.journeys} {now} />
	</aside>
</main>
