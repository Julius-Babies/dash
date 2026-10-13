<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.wallpaper}
	<img
		src={data.wallpaper.url}
		alt=""
		title={data.wallpaper.copyright}
		class="fixed inset-0 -z-10 h-full w-full object-cover"
	/>
{/if}

{@render children()}
