const API = 'https://v6.vbb.transport.rest';
const TTL = 30 * 1000;
const PAGES = 2;

export type Journey = {
	/** Stable across refreshes, unlike `departure`, which moves with delays. */
	id: string;
	departure: string;
	arrival: string;
	/** Departure delay in minutes. */
	delay: number;
	platform: string | null;
	cancelled: boolean;
	lines: { name: string; fg: string | null; bg: string | null }[];
};

type Leg = {
	walking?: boolean;
	cancelled?: boolean;
	departure: string | null;
	plannedDeparture: string;
	arrival: string | null;
	plannedArrival: string;
	departureDelay: number | null;
	departurePlatform: string | null;
	line: { name: string; color?: { fg: string; bg: string } };
};

export type Journeys = { journeys: Journey[]; fetchedAt: number };

const cache = new Map<string, Journeys>();

/** Falls back to the last successful result when VBB fails, which it regularly does with a 503. */
export async function getJourneys(from: string, to: string, fetch = globalThis.fetch) {
	const key = `${from}-${to}`;
	const cached = cache.get(key);
	if (cached && Date.now() - cached.fetchedAt < TTL) return cached;

	try {
		const result = { journeys: await fetchJourneys(from, to, fetch), fetchedAt: Date.now() };
		cache.set(key, result);
		return result;
	} catch (error) {
		if (!cached) throw error;
		console.warn('Serving cached journeys', error);
		return cached;
	}
}

async function fetchJourneys(from: string, to: string, fetch: typeof globalThis.fetch) {

	// The API returns at most a handful of journeys per request, so follow `laterRef` for more.
	const raw: { legs: Leg[] }[] = [];
	let laterThan: string | undefined;
	for (let page = 0; page < PAGES; page++) {
		const params = new URLSearchParams({
			from,
			to,
			results: '6',
			stopovers: 'false',
			remarks: 'false'
		});
		if (laterThan) params.set('laterThan', laterThan);
		const res = await fetch(`${API}/journeys?${params}`);
		if (!res.ok) throw new Error(`VBB responded with ${res.status}`);
		const body = await res.json();
		raw.push(...body.journeys);
		laterThan = body.laterRef;
		if (!laterThan) break;
	}

	return raw.map((journey): Journey => {
		const rides = journey.legs.filter((leg) => !leg.walking);
		const first = rides[0];
		const last = rides[rides.length - 1];
		return {
			id: [first.plannedDeparture, ...rides.map((leg) => leg.line.name)].join('|'),
			// Cancelled legs have no realtime times, only planned ones.
			departure: first.departure ?? first.plannedDeparture,
			arrival: last.arrival ?? last.plannedArrival,
			delay: Math.round((first.departureDelay ?? 0) / 60),
			platform: first.departurePlatform ?? null,
			cancelled: rides.some((leg) => leg.cancelled),
			lines: rides.map((leg) => ({
				name: leg.line.name,
				fg: leg.line.color?.fg ?? null,
				bg: leg.line.color?.bg ?? null
			}))
		};
	});
}
