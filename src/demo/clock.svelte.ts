/** One shared ticking clock, so N cards do not mean N intervals. */
class Clock {
	current = $state(Date.now());

	constructor() {
		if (typeof window !== 'undefined') {
			setInterval(() => (this.current = Date.now()), 10_000);
		}
	}
}

export const clock = new Clock();

export function relativeTime(at: number, now: number): string {
	const seconds = Math.max(0, Math.round((now - at) / 1000));
	if (seconds < 45) return 'just now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}
