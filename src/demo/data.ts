export type Severity = 'critical' | 'warning' | 'info' | 'stable';

export interface Signal {
	id: string;
	title: string;
	source: string;
	severity: Severity;
	/** 0-100 confidence, drives the meter on each card. */
	score: number;
	/** Epoch ms. Plain number rather than a Date so it survives `$state`. */
	at: number;
	note: string;
}

export type SortKey = 'score' | 'recent' | 'title' | 'severity';

export const SORTS: { key: SortKey; label: string }[] = [
	{ key: 'score', label: 'Confidence' },
	{ key: 'recent', label: 'Most recent' },
	{ key: 'severity', label: 'Severity' },
	{ key: 'title', label: 'Alphabetical' }
];

const SEVERITY_RANK: Record<Severity, number> = {
	critical: 0,
	warning: 1,
	info: 2,
	stable: 3
};

export const SEVERITY_LABEL: Record<Severity, string> = {
	critical: 'Critical',
	warning: 'Warning',
	info: 'Info',
	stable: 'Stable'
};

const TITLES = [
	'Latency spike on edge-04',
	'Queue depth climbing',
	'Certificate expiring',
	'Unusual login geography',
	'Cache hit ratio dropped',
	'Disk pressure on shard-2',
	'Replica lag recovered',
	'Error budget 40% spent',
	'Cold start regression',
	'Throughput back to baseline',
	'Retry storm detected',
	'Memory ceiling approached',
	'Payment webhook backlog',
	'Index rebuild finished',
	'Rate limit near threshold',
	'Slow query pattern found'
];

const SOURCES = [
	'edge-router',
	'billing-api',
	'auth-gateway',
	'search-index',
	'media-worker',
	'ledger-db',
	'notify-fanout'
];

const NOTES = [
	'Holding.',
	'No operator action required.',
	'p99 crossed the alerting threshold for three consecutive windows.',
	'Auto-remediation ran once and the metric settled back inside tolerance.',
	'Correlated with the deploy that landed eleven minutes ago; two downstream services are reporting the same shape, and the on-call runbook says to wait one more window before paging anybody.',
	'Within tolerance, but worth a look before the weekend — the same source did this twice last month and both times it turned into a real incident by Sunday.',
	'Recovered on its own.'
];

const SEVERITIES: Severity[] = ['critical', 'warning', 'info', 'stable'];

let counter = 0;

function pick<T>(list: T[]): T {
	return list[Math.floor(Math.random() * list.length)];
}

export function createSignal(at = Date.now()): Signal {
	counter += 1;
	return {
		id: `sig-${counter}-${Math.random().toString(36).slice(2, 7)}`,
		title: pick(TITLES),
		source: pick(SOURCES),
		severity: pick(SEVERITIES),
		score: Math.round(30 + Math.random() * 70),
		at,
		note: pick(NOTES)
	};
}

export function seedSignals(count = 6): Signal[] {
	const now = Date.now();
	return Array.from({ length: count }, (_, i) =>
		createSignal(now - (i + 1) * (60_000 + Math.random() * 900_000))
	);
}

export function sortSignals(signals: Signal[], key: SortKey): Signal[] {
	const copy = [...signals];
	copy.sort((a, b) => {
		switch (key) {
			case 'score':
				return b.score - a.score || a.title.localeCompare(b.title);
			case 'recent':
				return b.at - a.at;
			case 'severity':
				return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.score - a.score;
			case 'title':
				return a.title.localeCompare(b.title) || b.score - a.score;
		}
	});
	return copy;
}
