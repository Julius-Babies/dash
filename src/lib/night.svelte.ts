// Night mode dims the display and turns it red. It follows a schedule; switching it by hand
// holds until the schedule would have switched it the other way.

// Minutes into the day at which the schedule turns night mode on and off.
const START = 22 * 60;
const END = 5 * 60 + 55;

const STORAGE = 'dash:night';

type Override = { on: boolean; until: number };

// Set on the client only: the server doesn't know the visitor's time zone.
let now = $state<number>();
let override = $state<Override>();

function scheduled(time: number) {
	const date = new Date(time);
	const minutes = date.getHours() * 60 + date.getMinutes();
	return minutes >= START || minutes < END;
}

/** The next time the clock shows the given minute of the day. */
function next(minutes: number, from: number) {
	const date = new Date(from);
	date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
	if (date.getTime() <= from) date.setDate(date.getDate() + 1);
	return date.getTime();
}

function clock(minutes: number) {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

const active = $derived.by(() => {
	if (now === undefined) return false;
	return override && now < override.until ? override.on : scheduled(now);
});

export const night = {
	get active() {
		return active;
	},
	/** When the schedule turns night mode on and off, as shown on a clock. */
	start: clock(START),
	end: clock(END),
	toggle() {
		const on = !active;
		override = { on, until: next(on ? END : START, Date.now()) };
		localStorage.setItem(STORAGE, JSON.stringify(override));
	},
	/** Starts following the clock; returns a function that stops it. */
	run() {
		try {
			override = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') ?? undefined;
		} catch {
			// Unreadable storage only costs the manual switch.
		}
		now = Date.now();
		const interval = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(interval);
	}
};
