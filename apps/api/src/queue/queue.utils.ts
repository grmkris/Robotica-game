// At the top of the file, add these configurations
export const QUEUE_FREQUENCY_CONFIG = {
	FAST: { every: 1000 * 60 * 1 }, // Every 1 minute
	FREQUENT: { every: 1000 * 60 * 5 }, // Every 5 minutes
	NORMAL: { every: 1000 * 60 * 15 }, // Every 15 minutes
	RELAXED: { every: 1000 * 60 * 30 }, // Every 30 minutes
	CUSTOM: (minutes: number) => ({ every: 1000 * 60 * minutes }),
	CRON: (pattern: string) => ({ pattern }),
} as const;

export type QueueFrequencyConfig = typeof QUEUE_FREQUENCY_CONFIG;
export type QueueFrequencyPreset = keyof Omit<
	QueueFrequencyConfig,
	"CUSTOM" | "CRON"
>;

// Define repeat options type
export interface QueueRepeatOptions {
	pattern?: string; // Cron pattern
	every?: number; // Milliseconds interval
	startDate?: Date | number; // Optional start date
	endDate?: Date | number; // Optional end date
}
