// =============================================================================
// heartbeat/runner.ts — Per-workspace interval heartbeat timers
// =============================================================================

import { resolve } from "node:path";
import { createLogger } from "../logger.js";
import { PromptLoader } from "./prompts.js";
import type { TaskQueue } from "../session/queue.js";
import type { DaemonConfig, QuietWindow } from "../types.js";
import { WORKSPACES } from "../types.js";

const log = createLogger("heartbeat");

export class HeartbeatRunner {
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private getConfig: () => DaemonConfig;
  private queue: TaskQueue;
  private prompts: PromptLoader;

  constructor(
    getConfig: () => DaemonConfig,
    queue: TaskQueue,
    configDir: string,
  ) {
    this.getConfig = getConfig;
    this.queue = queue;
    this.prompts = new PromptLoader(resolve(configDir, "heartbeat"));
  }

  start(): void {
    this.scheduleAll();
    log.info("Heartbeat runner started");
  }

  stop(): void {
    for (const [ws, timer] of this.timers) {
      clearInterval(timer);
      log.debug("Heartbeat stopped", { workspace: ws });
    }
    this.timers.clear();
    log.info("Heartbeat runner stopped");
  }

  restart(): void {
    this.stop();
    this.scheduleAll();
  }

  private scheduleAll(): void {
    const config = this.getConfig();
    const hb = config.heartbeat;

    for (const ws of WORKSPACES) {
      const wsConfig = hb.workspaces[ws.name];
      const enabled = wsConfig?.enabled !== false; // default true
      if (!enabled) continue;

      const intervalMin =
        wsConfig?.interval_minutes || hb.default_interval_minutes;
      const intervalMs = intervalMin * 60 * 1000;

      const timer = setInterval(() => {
        this.fire(ws.name, wsConfig?.prompt_file);
      }, intervalMs);

      this.timers.set(ws.name, timer);
      log.info("Heartbeat scheduled", {
        workspace: ws.name,
        interval_min: intervalMin,
      });
    }
  }

  private fire(workspace: string, promptFile?: string): void {
    const config = this.getConfig();

    // Check quiet hours
    if (this.isQuietHour(config.quiet_hours, config.timezone)) {
      log.debug("Skipping heartbeat (quiet hours)", { workspace });
      return;
    }

    const prompt = this.prompts.getPrompt(workspace, promptFile);

    this.queue.enqueue({
      workspace,
      prompt,
      priority: "low",
      source: "heartbeat",
    });

    log.info("Heartbeat fired", { workspace });
  }

  private isQuietHour(windows: QuietWindow[], timezone: string): boolean {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );
    const dayName = parts.find((p) => p.type === "weekday")?.value || "";
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = dayMap[dayName] ?? 0;
    const currentMinutes = hour * 60 + minute;

    for (const window of windows) {
      // Check day filter
      if (window.days && !window.days.includes(day)) continue;

      const [startH, startM] = window.start.split(":").map(Number);
      const [endH, endM] = window.end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (startMin <= endMin) {
        // Same day window: e.g. 09:00 - 17:00
        if (currentMinutes >= startMin && currentMinutes < endMin) return true;
      } else {
        // Overnight window: e.g. 23:00 - 06:00
        if (currentMinutes >= startMin || currentMinutes < endMin) return true;
      }
    }

    return false;
  }
}
