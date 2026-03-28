// =============================================================================
// logger.ts — Structured JSON logger for the daemon
// =============================================================================

import { appendFileSync } from "node:fs";

const LOG_FILE = process.env.DAEMON_LOG_FILE || "/tmp/kodeclaw-daemon.log";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const rawLevel = process.env.DAEMON_LOG_LEVEL;
const MIN_LEVEL: LogLevel =
  rawLevel && rawLevel in LEVEL_PRIORITY ? (rawLevel as LogLevel) : "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatEntry(
  level: LogLevel,
  subsystem: string,
  message: string,
  data?: Record<string, unknown>,
): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    sub: subsystem,
    msg: message,
    ...data,
  });
}

function emit(
  level: LogLevel,
  subsystem: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;

  const line = formatEntry(level, subsystem, message, data);

  // Console output
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;
  fn(`[${subsystem}] ${message}`, data ? JSON.stringify(data) : "");

  // File output
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // Silently ignore file write errors
  }
}

export function createLogger(subsystem: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) =>
      emit("debug", subsystem, msg, data),
    info: (msg: string, data?: Record<string, unknown>) =>
      emit("info", subsystem, msg, data),
    warn: (msg: string, data?: Record<string, unknown>) =>
      emit("warn", subsystem, msg, data),
    error: (msg: string, data?: Record<string, unknown>) =>
      emit("error", subsystem, msg, data),
  };
}

export type Logger = ReturnType<typeof createLogger>;
