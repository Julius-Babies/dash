<script lang="ts">
	import { ChevronLeft, Moon, RotateCw, X } from '@lucide/svelte';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import type { AppHost, DashApp } from '#lib/apps/types.ts';
	import { night } from '#lib/night.svelte.ts';

	type Props = { open: boolean; now?: Date; apps: DashApp[]; host: AppHost };

	let { open = $bindable(), now, apps, host }: Props = $props();

	// The app that is open; the launcher shows while there is none.
	let active = $state<DashApp>();
	// The app that is on screen: it outlives `active` for as long as it shrinks back into its icon.
	let shown = $state<DashApp>();

	// Closes itself after this long without a touch or key press.
	const IDLE_TIMEOUT = 2 * 60_000;
	// How far a swipe has to travel before it counts as dragging, and before it closes.
	const DRAG_START = 8;
	const CLOSE_DISTANCE = 120;
	// How long an app takes to grow out of its icon, or to shrink back into it.
	const APP_ZOOM = 450;
	// How long after closing the sheet a tap on the night mode control takes effect.
	const NIGHT_DELAY = 1000;

	const timeFormat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
	const dateFormat = new Intl.DateTimeFormat('de-DE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	});

	// How far the sheet is pushed down, as a fraction of its height: 1 is off screen.
	const offset = new Tween(1, { duration: 450, easing: cubicOut });
	let height = $state(0);
	let dragStart: number | undefined;
	let drag = $state(0);
	let interactions = $state(0);

	$effect(() => {
		offset.target = open ? 0 : 1;
	});

	// Start from the launcher again next time, but only once the sheet is out of sight.
	$effect(() => {
		if (open || offset.current < 1) return;
		active = undefined;
		zoom.set(0, { duration: 0 });
	});

	$effect(() => {
		if (!open) return;
		void interactions;
		const timeout = setTimeout(() => (open = false), IDLE_TIMEOUT);
		return () => clearTimeout(timeout);
	});

	function onpointerdown(event: PointerEvent) {
		interactions++;
		// Apps mark areas that handle swipes themselves, such as scrolling lists.
		if (event.target instanceof Element && event.target.closest('[data-no-drag]')) return;
		dragStart = event.clientY;
	}

	function onpointermove(event: PointerEvent & { currentTarget: HTMLElement }) {
		if (dragStart === undefined) return;
		const distance = event.clientY - dragStart;
		if (drag === 0 && distance < DRAG_START) return;
		// Keep receiving the swipe even when the finger leaves the sheet.
		event.currentTarget.setPointerCapture(event.pointerId);
		drag = Math.max(0, distance);
	}

	function onpointerup() {
		if (dragStart === undefined) return;
		dragStart = undefined;
		if (drag === 0) return;
		// Hand the dragged distance over to the tween so it continues from where the finger left.
		offset.set(drag / height, { duration: 0 });
		const close = drag > CLOSE_DISTANCE;
		drag = 0;
		if (close) open = false;
		else offset.target = 0;
	}

	// How far the open app has grown out of its icon: 0 is the launcher, 1 the app at full size.
	// The header follows the same number, so that nothing in it moves on its own.
	const zoom = new Tween(0, { duration: APP_ZOOM, easing: cubicInOut });
	const BACK_WIDTH = 76;
	const ICON_RADIUS = 24;

	let content = $state<HTMLElement>();
	// How far the icon of the app sits from each edge of the content area.
	let icon = $state({ top: 0, right: 0, bottom: 0, left: 0 });

	const origin = $derived.by(() => {
		if (!content) return '50% 50%';
		const x = (icon.left + content.clientWidth - icon.right) / 2;
		const y = (icon.top + content.clientHeight - icon.bottom) / 2;
		return `${x}px ${y}px`;
	});

	// The app is cut out to a rounded box that starts as its icon and grows to the full area.
	const cutout = $derived.by(() => {
		const rest = 1 - zoom.current;
		if (rest === 0) return 'none';
		const sides = [icon.top, icon.right, icon.bottom, icon.left].map((side) => `${side * rest}px`);
		return `inset(${sides.join(' ')} round ${ICON_RADIUS * rest}px)`;
	});

	function launch(app: DashApp, tile: Element | null) {
		if (content && tile) {
			const area = content.getBoundingClientRect();
			const box = tile.getBoundingClientRect();
			icon = {
				top: box.top - area.top,
				right: area.right - box.right,
				bottom: area.bottom - box.bottom,
				left: box.left - area.left
			};
		}
		active = shown = app;
	}

	$effect(() => {
		zoom.target = active ? 1 : 0;
	});

	$effect(() => {
		if (!active && zoom.current === 0) shown = undefined;
	});

	// Night mode switches once the sheet is out of the way, so the change is seen on the home screen.
	function toggleNight() {
		open = false;
		setTimeout(night.toggle, NIGHT_DELAY);
	}

	function onkeydown(event: KeyboardEvent) {
		if (!open) return;
		interactions++;
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window {onkeydown} />

{#if open || offset.current < 1}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Apps"
		tabindex="-1"
		class="fixed inset-0 z-40 flex touch-none flex-col bg-black/60 text-white backdrop-blur-2xl select-none night:bg-black night:backdrop-blur-none"
		style:transform="translateY(calc({offset.current * 100}% + {drag}px))"
		bind:clientHeight={height}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
	>
		<div class="mx-auto mt-3 h-1 w-12 rounded-full bg-white/25"></div>

		<header class="flex items-center justify-between px-[5vw] pt-8">
			<div class="flex items-center">
				<!-- Makes room as the app grows, instead of pushing the time aside at once. -->
				<div
					class="overflow-hidden"
					style:width="{BACK_WIDTH * zoom.current}px"
					style:opacity={zoom.current}
					inert={!active}
				>
					<button
						type="button"
						aria-label="Zurück zu den Apps"
						class="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
						onclick={() => (active = undefined)}
					>
						<ChevronLeft size={28} strokeWidth={1.5} />
					</button>
				</div>
				{#if now}
					<time datetime={now.toISOString()} class="font-mono text-5xl font-extralight tracking-[-0.09em]">
						{#each timeFormat.format(now).split(':') as part, i (i)}
							<!-- The colon sits in a full-width cell; pull its neighbours in. -->
							{#if i > 0}<span class="-mx-[0.14em]">:</span>{/if}{part}
						{/each}
					</time>
					<!-- Date and app name share one cell and fade into each other. -->
					<p class="ml-5 grid self-end pb-1 text-xl font-light whitespace-nowrap text-white/60">
						<span class="col-start-1 row-start-1" style:opacity={1 - zoom.current}>
							{dateFormat.format(now)}
						</span>
						<span class="col-start-1 row-start-1" style:opacity={zoom.current}>
							{shown?.name}
						</span>
					</p>
				{/if}
			</div>

			<div class="flex gap-3">
				<button
					type="button"
					aria-label="Seite neu laden"
					class="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
					onclick={() => location.reload()}
				>
					<RotateCw size={24} strokeWidth={1.5} />
				</button>
				<button
					type="button"
					aria-label="Schließen"
					class="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
					onclick={() => (open = false)}
				>
					<X size={26} strokeWidth={1.5} />
				</button>
			</div>
		</header>

		<!-- The app grows out of its icon, on top of the launcher fading away behind it. -->
		<div class="relative min-h-0 flex-1 overflow-hidden" bind:this={content}>
			<ul
				class="absolute inset-0 flex flex-wrap content-start gap-8 px-[5vw] pt-10 pb-8"
				style:opacity={1 - Math.min(1, zoom.current * 2)}
				style:transform="scale({1 + zoom.current * 0.06})"
				style:transform-origin={origin}
				inert={!!active}
			>
				{#each apps as app (app.id)}
					<li>
						<button
							type="button"
							class="group flex w-28 cursor-pointer flex-col items-center gap-3"
							onclick={(event) => launch(app, event.currentTarget.firstElementChild)}
						>
							<span
								class="flex size-24 items-center justify-center rounded-3xl bg-white/10 transition-colors group-active:bg-white/30"
							>
								<app.icon size={40} strokeWidth={1.25} />
							</span>
							<span class="text-sm text-white/80">{app.name}</span>
						</button>
					</li>
				{/each}
			</ul>

			{#if shown}
				<div class="absolute inset-0" style:clip-path={cutout} inert={!active}>
					<!-- A surface like the tile of the icon, there only while the box is in between. -->
					<div
						class="absolute inset-0 bg-white/10"
						style:opacity={Math.sin(Math.PI * zoom.current)}
					></div>
					<div
						class="absolute inset-0 px-[5vw] pt-10 pb-8"
						style:opacity={Math.max(0, zoom.current * 1.5 - 0.5)}
						style:transform="scale({0.85 + zoom.current * 0.15})"
						style:transform-origin={origin}
					>
						<shown.view {host} />
					</div>
				</div>
			{/if}
		</div>

		<!-- Quick controls -->
		<footer class="flex gap-3 border-t border-white/10 px-[5vw] py-5">
			<button
				type="button"
				aria-pressed={night.active}
				class={[
					'flex h-16 cursor-pointer items-center gap-4 rounded-full pr-7 pl-5 transition-colors',
					night.active ? 'bg-white/25 active:bg-white/35' : 'bg-white/10 active:bg-white/30'
				]}
				onclick={toggleNight}
			>
				<Moon size={26} strokeWidth={1.5} />
				<span class="flex flex-col items-start leading-tight">
					<span>Nachtmodus</span>
					<span class="text-sm text-white/50">
						{#if night.active}
							An bis {timeFormat.format(night.ends.at)}
							{#if night.ends.alarm}· Wecker {timeFormat.format(night.ends.alarm)}{/if}
						{:else}
							Aus bis {night.start}
						{/if}
					</span>
				</span>
			</button>
		</footer>
	</div>
{/if}
