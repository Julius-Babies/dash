import { getJourneys } from '#lib/server/vbb.ts';
import { getWeather } from '#lib/server/weather.ts';
import type { PageServerLoad } from './$types';

const GOLM = '900220010';
const GRIEBNITZSEE = '900230003';
const POTSDAM = { latitude: 52.41, longitude: 12.97 };

async function orNull<T>(label: string, promise: Promise<T>) {
	try {
		return await promise;
	} catch (error) {
		console.error(`Failed to load ${label}`, error);
		return null;
	}
}

export const load: PageServerLoad = async ({ fetch, depends }) => {
	depends('app:live');

	const [journeys, weather] = await Promise.all([
		orNull('journeys', getJourneys(GOLM, GRIEBNITZSEE, fetch)),
		orNull('weather', getWeather(POTSDAM.latitude, POTSDAM.longitude, fetch))
	]);
	return { journeys, weather };
};
