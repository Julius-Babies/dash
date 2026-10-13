import type { AppHost } from '../types.ts';

const STORAGE = 'dash:clock-alarms';
const TICK = 1000;
// Alarms due within this time show on the home screen.
const UPCOMING = 12 * 60 * 60_000;
// An alarm that was missed by more than this, e.g. while the device slept, stays silent.
const GRACE = 10 * 60_000;

/** Weekdays as `Date.getDay()` numbers them, in the order a German week lists them. */
export const WEEKDAYS = [
	{ day: 1, label: 'Mo' },
	{ day: 2, label: 'Di' },
	{ day: 3, label: 'Mi' },
	{ day: 4, label: 'Do' },
	{ day: 5, label: 'Fr' },
	{ day: 6, label: 'Sa' },
	{ day: 0, label: 'So' }
];

export type Alarm = {
	id: string;
	hour: number;
	minute: number;
	/** Weekdays it rings on, as `Date.getDay()` numbers. Empty: rings once, then turns off. */
	days: number[];
	enabled: boolean;
};

export type AlarmTime = Pick<Alarm, 'hour' | 'minute' | 'days'>;

export function formatTime({ hour, minute }: Pick<Alarm, 'hour' | 'minute'>) {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatDays(days: number[]) {
	const labels = WEEKDAYS.filter(({ day }) => days.includes(day)).map(({ label }) => label);
	if (labels.length === 0) return 'Einmalig';
	if (labels.length === 7) return 'Täglich';
	const joined = labels.join(', ');
	if (joined === 'Mo, Di, Mi, Do, Fr') return 'Mo–Fr';
	if (joined === 'Sa, So') return 'Wochenende';
	return joined;
}

/** The first time after `from` at which the alarm is due. */
export function nextRing(alarm: AlarmTime, from: number) {
	// One more than a week: today's weekday may only match again in seven days.
	for (let offset = 0; offset <= 7; offset++) {
		const date = new Date(from);
		date.setDate(date.getDate() + offset);
		date.setHours(alarm.hour, alarm.minute, 0, 0);
		if (date.getTime() <= from) continue;
		if (alarm.days.length === 0 || alarm.days.includes(date.getDay())) return date.getTime();
	}
	return Infinity;
}

class Alarms {
	list = $state<Alarm[]>([]);
	#now = $state(Date.now());

	/** By time of day. */
	sorted = $derived(
		this.list.toSorted((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))
	);

	/** Alarms that ring soon, soonest first. */
	upcoming = $derived(
		this.list
			.filter((alarm) => alarm.enabled)
			.map((alarm) => ({ alarm, at: nextRing(alarm, this.#now) }))
			.filter(({ at }) => at - this.#now <= UPCOMING)
			.sort((a, b) => a.at - b.at)
	);

	add(time: AlarmTime) {
		this.list.push({
			// Not `crypto.randomUUID()`: that needs HTTPS, which a display in the local network lacks.
			id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			...time,
			enabled: true
		});
		this.#save();
	}

	/** Changing an alarm also turns it back on. */
	update(id: string, time: AlarmTime) {
		const alarm = this.list.find((alarm) => alarm.id === id);
		if (!alarm) return;
		Object.assign(alarm, time, { enabled: true });
		this.#save();
	}

	toggle(id: string) {
		const alarm = this.list.find((alarm) => alarm.id === id);
		if (!alarm) return;
		alarm.enabled = !alarm.enabled;
		this.#save();
	}

	remove(id: string) {
		this.list = this.list.filter((alarm) => alarm.id !== id);
		this.#save();
	}

	/** Restores saved alarms and rings through `host` when they are due. */
	start(host: AppHost) {
		try {
			this.list = JSON.parse(localStorage.getItem(STORAGE) ?? '[]');
		} catch {
			// Unreadable storage only costs the saved alarms.
		}

		host.wakeBy((after) => {
			const rings = this.list.filter((alarm) => alarm.enabled).map((alarm) => nextRing(alarm, after));
			return rings.length > 0 ? Math.min(...rings) : undefined;
		});

		let checked = Date.now();
		const interval = setInterval(() => {
			const now = Date.now();
			for (const alarm of this.list) {
				if (!alarm.enabled) continue;
				const due = nextRing(alarm, checked);
				if (due > now) continue;
				if (alarm.days.length === 0) this.toggle(alarm.id);
				if (now - due <= GRACE) host.alert({ title: 'Wecker', detail: formatTime(alarm) });
			}
			checked = now;
			this.#now = now;
		}, TICK);
		return () => clearInterval(interval);
	}

	#save() {
		localStorage.setItem(STORAGE, JSON.stringify(this.list));
	}
}

export const alarms = new Alarms();
