<script lang="ts">
	import { ChevronLeft, Moon, RotateCw, X } from '@lucide/svelte';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import type { AppHost, DashApp } from '#lib/apps/types.ts';
	import { night } from '#lib/night.svelte.ts';

	type Props = { open: boolean; now?: Date; apps: DashApp[]; host: AppHost };

	let { open = $bindable(), now, apps, host }: Props = $props();

	// The app that is open; the launcher shows while there is none.
	let active = $state<DashApp>();

	// Closes itself after this long without a touch or key press.
	const IDLE_TIMEOUT = 2 * 60_000;
	// How far a swipe has to travel before it counts as dragging, and before it closes.
	const DRAG_START = 8;
	const CLOSE_DISTANCE = 120;

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
		if (!open && offset.current >= 1) active = undefined;
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
		class="fixed inset-0 z-40 flex touch-none flex-col bg-black/60 text-white backdrop-blur-2xl select-none"
		style:transform="translateY(calc({offset.current * 100}% + {drag}px))"
		bind:clientHeight={height}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
	>
		<div class="mx-auto mt-3 h-1 w-12 rounded-full bg-white/25"></div>

		<header class="flex items-center justify-between px-[5vw] pt-8">
			<div class="flex items-center gap-5">
				{#if active}
					<button
						type="button"
						aria-label="Zurück zu den Apps"
						class="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors active:bg-white/30"
						onclick={() => (active = undefined)}
					>
						<ChevronLeft size={28} strokeWidth={1.5} />
					</button>
				{/if}
				{#if now}
					<time datetime={now.toISOString()} class="font-mono text-5xl font-extralight tracking-[-0.09em]">
						{#each timeFormat.format(now).split(':') as part, i (i)}
							<!-- The colon sits in a full-width cell; pull its neighbours in. -->
							{#if i > 0}<span class="-mx-[0.14em]">:</span>{/if}{part}
						{/each}
					</time>
					<p class="self-end pb-1 text-xl font-light text-white/60">
						{active ? active.name : dateFormat.format(now)}
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

		<div class="min-h-0 flex-1 px-[5vw] pt-10 pb-8">
			{#if active}
				<active.view {host} />
			{:else}
				<ul class="flex flex-wrap gap-8">
					{#each apps as app (app.id)}
						<li>
							<button
								type="button"
								class="group flex w-28 cursor-pointer flex-col items-center gap-3"
								onclick={() => (active = app)}
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
				onclick={night.toggle}
			>
				<Moon size={26} strokeWidth={1.5} />
				<span class="flex flex-col items-start leading-tight">
					<span>Nachtmodus</span>
					<span class="text-sm text-white/50">
						{night.active ? `An bis ${night.end}` : `Aus bis ${night.start}`}
					</span>
				</span>
			</button>
		</footer>
	</div>
{/if}
