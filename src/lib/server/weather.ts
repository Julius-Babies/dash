const API = 'https://api.open-meteo.com/v1/forecast';
const TTL = 15 * 60 * 1000;

export type HourlyWeather = {
	time: number;
	temperature: number;
	/** Precipitation in mm. */
	precipitation: number;
	/** Precipitation probability in percent. */
	probability: number;
	/** WMO weather code. */
	code: number;
	isDay: boolean;
};

export type DailyWeather = {
	time: number;
	min: number;
	max: number;
	/** Precipitation sum in mm. */
	precipitation: number;
	code: number;
};

export type Weather = { hourly: HourlyWeather[]; daily: DailyWeather[] };

const cache = new Map<string, { weather: Weather; fetchedAt: number }>();

async function getForecast(latitude: number, longitude: number, fetch: typeof globalThis.fetch) {
	const key = `${latitude},${longitude}`;
	const cached = cache.get(key);
	if (cached && Date.now() - cached.fetchedAt < TTL) return cached.weather;

	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		hourly: 'temperature_2m,precipitation,precipitation_probability,weather_code,is_day',
		daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
		timezone: 'Europe/Berlin',
		timeformat: 'unixtime',
		forecast_days: '4'
	});
	const res = await fetch(`${API}?${params}`);
	if (!res.ok) throw new Error(`Open-Meteo responded with ${res.status}`);
	const { hourly, daily } = await res.json();

	const weather: Weather = {
		hourly: hourly.time.map((time: number, i: number) => ({
			time: time * 1000,
			temperature: hourly.temperature_2m[i],
			precipitation: hourly.precipitation[i],
			probability: hourly.precipitation_probability[i],
			code: hourly.weather_code[i],
			isDay: hourly.is_day[i] === 1
		})),
		daily: daily.time.map((time: number, i: number) => ({
			time: time * 1000,
			min: daily.temperature_2m_min[i],
			max: daily.temperature_2m_max[i],
			precipitation: daily.precipitation_sum[i],
			code: daily.weather_code[i]
		}))
	};

	cache.set(key, { weather, fetchedAt: Date.now() });
	return weather;
}

/** Every hour of today, and the three days after it. */
export async function getWeather(
	latitude: number,
	longitude: number,
	fetch = globalThis.fetch
): Promise<Weather> {
	const { hourly, daily } = await getForecast(latitude, longitude, fetch);
	const now = Date.now();
	// Day boundaries come from the API so that DST days with 23 or 25 hours work.
	const today = daily.findLastIndex((day) => day.time <= now);
	const start = daily[today]?.time ?? now;
	const end = daily[today + 1]?.time ?? Infinity;
	return {
		hourly: hourly.filter((hour) => hour.time >= start && hour.time < end),
		daily: daily.slice(today + 1, today + 4)
	};
}
