// =============================================================================
// daemon/index.ts — KodeClaw daemon orchestrator
// =============================================================================

import type { Server } from "node:http";
import { resolve } from "node:path";
import { ConfigManager } from "./config.js";
import { SessionManager } from "./session/manager.js";
import { TaskQueue } from "./session/queue.js";
import { createLogger } from "./logger.js";
import { getPersonaInfo } from "./persona.js";
import { WORKSPACES } from "./types.js";
import type { DaemonState } from "./types.js";

const log = createLogger("daemon");

const CONFIG_DIR =
  process.env.DAEMON_CONFIG_DIR || resolve(__dirname, "../config");
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || "3", 10);

let heartbeatRunner: { start: () => void; stop: () => void } | null = null;
let cronScheduler: {
  start: () => void;
  stop: () => void;
  getJobs: () => any[];
} | null = null;
let telegramBot: { start: () => void; stop: () => void } | null = null;

let configManager: ConfigManager;
let sessionManager: SessionManager;
let taskQueue: TaskQueue;
let startedAt: string;

const workspacePathMap: Record<string, string> = {};
for (const ws of WORKSPACES) {
  workspacePathMap[ws.name] = ws.path;
}

export async function startDaemon(httpServer: Server): Promise<void> {
  startedAt = new Date().toISOString();
  log.info("KodeClaw daemon starting", { config_dir: CONFIG_DIR });

  // 1. Config
  configManager = new ConfigManager(CONFIG_DIR);
  configManager.load();
  configManager.startPolling();

  // 2. Sessions
  const config = configManager.current;
  sessionManager = new SessionManager(config.session.max_turns_before_compact);

  // 3. Task Queue
  taskQueue = new TaskQueue(
    sessionManager,
    () => configManager.current,
    MAX_CONCURRENT,
    workspacePathMap,
  );

  // 4. Heartbeat
  if (config.heartbeat.enabled) {
    try {
      const { HeartbeatRunner } = await import("./heartbeat/runner.js");
      const runner = new HeartbeatRunner(
        () => configManager.current,
        taskQueue,
        CONFIG_DIR,
      );
      runner.start();
      heartbeatRunner = runner;
      log.info("Heartbeat subsystem started");
    } catch (err) {
      log.error("Failed to start heartbeat", { error: String(err) });
    }
  }

  // 5. Cron
  if (config.cron.enabled) {
    try {
      const { CronScheduler } = await import("./cron/scheduler.js");
      const scheduler = new CronScheduler(
        () => configManager.current,
        taskQueue,
      );
      scheduler.start();
      cronScheduler = scheduler;
      log.info("Cron subsystem started");
    } catch (err) {
      log.error("Failed to start cron", { error: String(err) });
    }
  }

  // 6. Telegram
  if (config.telegram.enabled) {
    const token = process.env[config.telegram.token_env];
    if (token) {
      try {
        const { TelegramBotService } = await import("./telegram/bot.js");
        const bot = new TelegramBotService(
          token,
          () => configManager.current,
          taskQueue,
          sessionManager,
          () => cronScheduler?.getJobs() || [],
        );
        bot.start();
        telegramBot = bot;
        log.info("Telegram subsystem started");
      } catch (err) {
        log.error("Failed to start Telegram", { error: String(err) });
      }
    } else {
      log.warn("Telegram enabled but token not found", {
        env_var: config.telegram.token_env,
      });
    }
  }

  // 7. Dashboard
  if (config.dashboard.enabled) {
    try {
      const { mountDashboard } = await import("./dashboard/routes.js");
      mountDashboard(httpServer, getDaemonState);
      log.info("Dashboard subsystem mounted");
    } catch (err) {
      log.error("Failed to mount dashboard", { error: String(err) });
    }
  }

  configManager.on("reload", () => {
    log.info("Config reloaded, subsystems will pick up changes");
  });

  const persona = getPersonaInfo();
  log.info("KodeClaw daemon started", {
    persona: persona?.name || "default",
    heartbeat: !!heartbeatRunner,
    cron: !!cronScheduler,
    telegram: !!telegramBot,
    dashboard: config.dashboard.enabled,
  });
}

export function getDaemonState(): DaemonState {
  const persona = getPersonaInfo();
  return {
    started_at: startedAt,
    subsystems: {
      heartbeat: !!heartbeatRunner,
      cron: !!cronScheduler,
      telegram: !!telegramBot,
      dashboard: configManager?.current.dashboard.enabled ?? false,
    },
    sessions: sessionManager?.getAllSessions() ?? {},
    queue_depth: taskQueue?.depth ?? 0,
    in_flight: taskQueue?.inFlight ?? 0,
    recent_runs: taskQueue?.getHistory().slice(0, 50) ?? [],
    jobs: cronScheduler?.getJobs() ?? [],
    persona: persona ? { name: persona.name, emoji: persona.emoji } : null,
  };
}

export function getTaskQueue(): TaskQueue | null {
  return taskQueue;
}

export function getSessionManager(): SessionManager | null {
  return sessionManager;
}

export function getConfigManager(): ConfigManager | null {
  return configManager;
}

export async function stopDaemon(): Promise<void> {
  log.info("KodeClaw daemon shutting down");
  heartbeatRunner?.stop();
  cronScheduler?.stop();
  telegramBot?.stop();
  configManager?.stopPolling();
  log.info("KodeClaw daemon stopped");
}
