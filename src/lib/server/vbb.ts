const API = 'https://v6.vbb.transport.rest';
const TTL = 30 * 1000;
const PAGES = 2;

export type Journey = {
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

const cache = new Map<string, { journeys: Journey[]; fetchedAt: number }>();

export async function getJourneys(from: string, to: string, fetch = globalThis.fetch) {
	const key = `${from}-${to}`;
	const cached = cache.get(key);
	if (cached && Date.now() - cached.fetchedAt < TTL) return cached.journeys;

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

	const journeys: Journey[] = raw.map((journey) => {
		const rides = journey.legs.filter((leg) => !leg.walking);
		const first = rides[0];
		const last = rides[rides.length - 1];
		return {
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

	cache.set(key, { journeys, fetchedAt: Date.now() });
	return journeys;
}
