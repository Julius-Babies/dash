import type { LayoutServerLoad } from './$types';

const BING = 'https://www.bing.com';
const TTL = 60 * 60 * 1000;

type Wallpaper = { url: string; title: string; copyright: string };

let cached: { wallpaper: Wallpaper; fetchedAt: number } | undefined;

export const load: LayoutServerLoad = async ({ fetch }) => {
	if (cached && Date.now() - cached.fetchedAt < TTL) return { wallpaper: cached.wallpaper };

	try {
		const res = await fetch(`${BING}/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=de-DE`);
		if (!res.ok) throw new Error(`Bing responded with ${res.status}`);
		const [image] = (await res.json()).images;
		const wallpaper: Wallpaper = {
			url: `${BING}${image.urlbase}_UHD.jpg`,
			title: image.title,
			copyright: image.copyright
		};
		cached = { wallpaper, fetchedAt: Date.now() };
		return { wallpaper };
	} catch (error) {
		console.error('Failed to load Bing wallpaper', error);
		// Serve the stale image rather than no background at all.
		return { wallpaper: cached?.wallpaper ?? null };
	}
};
