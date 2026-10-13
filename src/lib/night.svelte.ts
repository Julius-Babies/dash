// Night mode dims the display and turns it red. It follows a schedule; switching it by hand
// holds until the schedule would have switched it the other way.

// Minutes into the day at which the schedule turns night mode on and off.
const START = 22 * 60;
const END = 5 * 60 + 55;
// An alarm that rings before this minute of the day ends the night instead, a little ahead.
const MORNING = 9 * 60;
const ALARM_LEAD = 5 * 60_000;

const STORAGE = 'dash:night';

// A switch by hand, and when it was made.
type Override = { on: boolean; since: number };

// Set on the client only: the server doesn't know the visitor's time zone.
let now = $state<number>();
let override = $state<Override>();
// Returns the first time after the given one at which an alarm rings.
let nextAlarm = $state.raw<(after: number) => number | undefined>();

type End = { at: number; /** The alarm it was moved for. */ alarm?: number };

function at(day: number, minutes: number) {
	const date = new Date(day);
	date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
	return date.getTime();
}

/** When the night ends on the morning of the given day. */
function endOn(day: number): End {
	const alarm = nextAlarm?.(at(day, 0) - 1);
	if (alarm !== undefined && alarm < at(day, MORNING)) return { at: alarm - ALARM_LEAD, alarm };
	return { at: at(day, END) };
}

/** The first end of a night after `from`. */
function nextEnd(from: number) {
	const today = endOn(from);
	if (today.at > from) return today;
	const tomorrow = new Date(from);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return endOn(tomorrow.getTime());
}

function scheduled(time: number) {
	const date = new Date(time);
	const minutes = date.getHours() * 60 + date.getMinutes();
	return minutes >= START || time < endOn(time).at;
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

// The switch by hand, for as long as it holds: until the schedule would have undone it.
const held = $derived.by(() => {
	if (now === undefined || !override) return;
	const until = override.on ? nextEnd(override.since).at : next(START, override.since);
	// Also drops what an older version stored, which has no `since`.
	return now < until ? override : undefined;
});

const active = $derived(now !== undefined && (held ? held.on : scheduled(now)));

const ends = $derived(nextEnd(held?.on ? held.since : (now ?? Date.now())));

export const night = {
	get active() {
		return active;
	},
	/** When the schedule turns night mode on, as shown on a clock. */
	start: clock(START),
	/** When night mode ends next, or would if it were on. */
	get ends() {
		return ends;
	},
	/** Lets alarms end the night early or late; `next` returns the first ring after a time. */
	wakeBy(next: (after: number) => number | undefined) {
		nextAlarm = next;
	},
	toggle() {
		override = { on: !active, since: Date.now() };
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
