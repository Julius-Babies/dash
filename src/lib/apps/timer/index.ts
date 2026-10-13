import { Timer } from '@lucide/svelte';
import type { DashApp } from '../types.ts';
import TimerActivity from './TimerActivity.svelte';
import TimerApp from './TimerApp.svelte';
import { timers } from './timers.svelte.ts';

export const timer: DashApp = {
	id: 'timer',
	name: 'Timer',
	icon: Timer,
	view: TimerApp,
	activity: TimerActivity,
	start: (host) => timers.start(host)
};
