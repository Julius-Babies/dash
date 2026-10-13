<script lang="ts">
	import { X } from '@lucide/svelte';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';

	type Props = { open: boolean; now?: Date };

	let { open = $bindable(), now }: Props = $props();

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

	$effect(() => {
		if (!open) return;
		void interactions;
		const timeout = setTimeout(() => (open = false), IDLE_TIMEOUT);
		return () => clearTimeout(timeout);
	});

	function onpointerdown(event: PointerEvent) {
		interactions++;
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
			<div class="flex items-baseline gap-5">
				{#if now}
					<time datetime={now.toISOString()} class="font-mono text-5xl font-extralight tracking-[-0.09em]">
						{#each timeFormat.format(now).split(':') as part, i (i)}
							<!-- The colon sits in a full-width cell; pull its neighbours in. -->
							{#if i > 0}<span class="-mx-[0.14em]">:</span>{/if}{part}
						{/each}
					</time>
					<p class="text-xl font-light text-white/60">{dateFormat.format(now)}</p>
				{/if}
			</div>

			<button
				type="button"
				aria-label="Schließen"
				class="flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
				onclick={() => (open = false)}
			>
				<X size={26} strokeWidth={1.5} />
			</button>
		</header>
	</div>
{/if}
