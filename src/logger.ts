type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	none: 4,
};

class Logger {
	private prefix = '[ExternalFileLinks]';
	private level: LogLevel = 'warn';

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	debug(...args: unknown[]): void {
		if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
			console.log(this.prefix, ...args);
		}
	}

	info(...args: unknown[]): void {
		if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
			console.log(this.prefix, ...args);
		}
	}

	warn(...args: unknown[]): void {
		if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
			console.warn(this.prefix, ...args);
		}
	}

	error(...args: unknown[]): void {
		if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
			console.error(this.prefix, ...args);
		}
	}
}

export const logger = new Logger();
export type { LogLevel };
