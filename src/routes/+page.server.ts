import { getJourneys } from '#lib/server/vbb.ts';
import type { PageServerLoad } from './$types';

const GOLM = '900220010';
const GRIEBNITZSEE = '900230003';

export const load: PageServerLoad = async ({ fetch, depends }) => {
	depends('app:journeys');

	try {
		return { journeys: await getJourneys(GOLM, GRIEBNITZSEE, fetch) };
	} catch (error) {
		console.error('Failed to load journeys', error);
		return { journeys: null };
	}
};
