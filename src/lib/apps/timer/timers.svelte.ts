import type { AppHost } from '../types.ts';

const STORAGE = 'dash:timers';
const TICK = 250;

export type Timer = {
	id: string;
	/** What it was set to, in ms. */
	duration: number;
	/** Time left when it was last paused or started, in ms. */
	remaining: number;
	/** When it runs out. `null` while paused. */
	endsAt: number | null;
};

export function formatDuration(ms: number) {
	const total = Math.ceil(ms / 1000);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = String(total % 60).padStart(2, '0');
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
		: `${minutes}:${seconds}`;
}

class Timers {
	list = $state<Timer[]>([]);
	#now = $state(Date.now());

	/** Soonest first. */
	sorted = $derived(this.list.toSorted((a, b) => this.remaining(a) - this.remaining(b)));

	remaining(timer: Timer) {
		return timer.endsAt === null ? timer.remaining : Math.max(0, timer.endsAt - this.#now);
	}

	add(duration: number) {
		this.#now = Date.now();
		this.list.push({
			// Not `crypto.randomUUID()`: that needs HTTPS, which a display in the local network lacks.
			id: `${this.#now}-${Math.random().toString(36).slice(2)}`,
			duration,
			remaining: duration,
			endsAt: this.#now + duration
		});
		this.#save();
	}

	toggle(id: string) {
		const timer = this.list.find((timer) => timer.id === id);
		if (!timer) return;
		if (timer.endsAt === null) {
			timer.endsAt = Date.now() + timer.remaining;
		} else {
			timer.remaining = Math.max(0, timer.endsAt - Date.now());
			timer.endsAt = null;
		}
		this.#save();
	}

	remove(id: string) {
		this.list = this.list.filter((timer) => timer.id !== id);
		this.#save();
	}

	/** Restores saved timers and rings through `host` as they run out. */
	start(host: AppHost) {
		try {
			this.list = JSON.parse(localStorage.getItem(STORAGE) ?? '[]');
		} catch {
			// Unreadable storage only costs the saved timers.
		}

		const interval = setInterval(() => {
			this.#now = Date.now();
			for (const timer of this.list) {
				if (timer.endsAt === null || timer.endsAt > this.#now) continue;
				this.remove(timer.id);
				host.alert({ title: 'Timer abgelaufen', detail: formatDuration(timer.duration) });
			}
		}, TICK);
		return () => clearInterval(interval);
	}

	#save() {
		localStorage.setItem(STORAGE, JSON.stringify(this.list));
	}
}

export const timers = new Timers();
