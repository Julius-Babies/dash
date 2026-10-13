import { AlarmClock } from '@lucide/svelte';
import type { DashApp } from '../types.ts';
import AlarmActivity from './AlarmActivity.svelte';
import AlarmApp from './AlarmApp.svelte';
import { alarms } from './alarms.svelte.ts';

export const alarm: DashApp = {
	id: 'alarm',
	name: 'Wecker',
	icon: AlarmClock,
	view: AlarmApp,
	activity: AlarmActivity,
	start: (host) => alarms.start(host)
};
