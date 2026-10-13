import type { Component } from 'svelte';
import type { Alert } from '#lib/alerts.svelte.ts';

/** What the dashboard offers an app. Apps talk to the rest of the page only through this. */
export type AppHost = {
	/** Closes the app drawer and returns to the home screen. */
	goHome(): void;
	/** Shows a full-screen alert with the alarm sound until it is dismissed. */
	alert(alert: Alert): void;
};

/**
 * An app in the drawer. To add one, create a folder next to this file that exports a `DashApp`
 * and list it in `index.ts`.
 */
export type DashApp = {
	id: string;
	name: string;
	icon: Component<{ size?: number | string; strokeWidth?: number | string }>;
	/** The app itself, shown in the drawer below the header. */
	view: Component<{ host: AppHost }>;
	/** Shown above the clock on the home screen. Should render nothing while there is nothing live. */
	activity?: Component;
	/**
	 * Runs once in the browser when the dashboard loads, for work that has to go on while the
	 * app isn't open. May return a cleanup function.
	 */
	start?(host: AppHost): (() => void) | void;
};
