<script lang="ts">
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
</script>

<svelte:head>
	<title>Dash</title>
</svelte:head>

{#if now}
	<div
		class="fixed bottom-[12vh] left-[5vw] text-white select-none"
	>
		<time datetime={now.toISOString()} class="block text-[clamp(5rem,13vw,11rem)] leading-none font-light tabular-nums">
			{timeFormat.format(now)}
		</time>
		<p class="mt-[1vw] text-[clamp(1.75rem,4vw,3.5rem)] leading-tight font-light">
			{dateFormat.format(now)}
		</p>
	</div>
{/if}
