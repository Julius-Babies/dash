/** Full-screen alerts with the alarm sound. They queue up and are dismissed one at a time. */
export type Alert = { title: string; detail?: string };

const queue = $state<Alert[]>([]);

let audioContext: AudioContext | undefined;
let soundBuffer: Promise<AudioBuffer> | undefined;
let soundSource: AudioBufferSourceNode | undefined;

function getAudioContext() {
	const context = (audioContext ??= new AudioContext());
	soundBuffer ??= fetch('/alarm.mp3')
		.then((res) => res.arrayBuffer())
		.then((data) => context.decodeAudioData(data));
	return context;
}

async function startSound() {
	const context = getAudioContext();
	// Without a tap so far this stays pending; the source below then waits for `unlock`.
	context.resume().catch(() => {});
	const buffer = await soundBuffer!;
	if (queue.length === 0 || soundSource) return;
	soundSource = new AudioBufferSourceNode(context, { buffer, loop: true });
	soundSource.connect(context.destination);
	soundSource.start();
}

function stopSound() {
	soundSource?.stop();
	soundSource = undefined;
}

export const alerts = {
	get current(): Alert | undefined {
		return queue[0];
	},

	ring(alert: Alert) {
		queue.push(alert);
		startSound().catch((error) => console.error('Failed to play alarm sound', error));
	},

	dismiss() {
		queue.shift();
		if (queue.length === 0) stopSound();
	},

	/**
	 * Call from a tap. Unless the browser is set up to allow autoplay, an audio context stays
	 * suspended until it is resumed from one. Resuming makes no sound itself, and an alert that
	 * is already ringing silently becomes audible.
	 */
	unlock() {
		getAudioContext()
			.resume()
			.catch(() => {});
	}
};
