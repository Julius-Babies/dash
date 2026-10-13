<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { night } from '#lib/night.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	onMount(night.run);

	// The colours of night mode hang off this class, see layout.css.
	$effect(() => {
		document.documentElement.classList.toggle('night', night.active);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.wallpaper}
	<img
		src={data.wallpaper.url}
		alt=""
		class={[
			'fixed inset-0 -z-10 h-full w-full object-cover transition-[filter] duration-1000',
			night.active ? 'brightness-[0.12] grayscale' : 'brightness-50'
		]}
	/>
{/if}

{@render children()}
