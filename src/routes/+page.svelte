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

	$effect(() => {
		const interval = setInterval(() => invalidate('app:live'), 60_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Dash</title>
</svelte:head>

<main class="grid h-dvh grid-rows-[auto_1fr_1fr] gap-6 p-[5vw] text-white md:grid-cols-2 md:grid-rows-2">
	<section class="flex flex-col justify-end select-none md:row-span-2">
		{#if now}
			<time
				datetime={now.toISOString()}
				class="block text-[clamp(5rem,13vw,11rem)] leading-none font-light tabular-nums"
			>
				{timeFormat.format(now)}
			</time>
			<p class="mt-[1vw] text-[clamp(1.25rem,2.5vw,2.25rem)] leading-tight font-light">
				{dateFormat.format(now)}
			</p>
		{/if}
	</section>

	<Weather place="Potsdam" weather={data.weather} />

	<Connections from="Golm" to="Griebnitzsee" journeys={data.journeys} {now} />
</main>
