// =============================================================================
// config.ts — Hot-reload YAML config with 30s polling
// =============================================================================

import { readFileSync, statSync } from "node:fs";
import { EventEmitter } from "node:events";
import { resolve } from "node:path";
import YAML from "yaml";
import type { DaemonConfig } from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("config");

const POLL_INTERVAL_MS = 30_000;

const DEFAULT_CONFIG: DaemonConfig = {
  timezone: process.env.TZ || "Asia/Jakarta",
  security_level: "moderate",
  quiet_hours: [{ start: "23:00", end: "06:00" }],
  heartbeat: {
    enabled: true,
    default_interval_minutes: 30,
    workspaces: {},
  },
  cron: {
    enabled: true,
    jobs_dir: "", // resolved at runtime
  },
  telegram: {
    enabled: false,
    token_env: "TELEGRAM_BOT_TOKEN",
    default_workspace: "kodemeio",
    allowed_user_ids: [],
    forward_heartbeat: true,
    forward_cron: false,
    react_on_receive: "👀",
    react_on_complete: "✅",
    react_on_error: "❌",
  },
  dashboard: {
    enabled: true,
    port: 3100,
  },
  session: {
    max_turns_before_compact: 25,
    compaction_prompt:
      "Summarize our conversation context so far in bullet points, then continue with fresh context.",
    timeout_minutes: 5,
  },
  persona: {
    enabled: true,
    identity_file: "", // resolved at runtime
    soul_file: "", // resolved at runtime
  },
  voice: {
    stt_providers: [], // auto-detect: groq → openai → local
    tts_enabled: false,
    tts_provider: "openai",
    tts_model: "tts-1",
    tts_voice: "onyx",
    voice_back_triggers: ["read this", "tell me", "say it", "voice"],
  },
};

export class ConfigManager extends EventEmitter {
  private config: DaemonConfig = { ...DEFAULT_CONFIG };
  private configPath: string;
  private configDir: string;
  private lastMtime: number = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(configDir: string) {
    super();
    this.configDir = configDir;
    this.configPath = resolve(configDir, "daemon.yaml");

    // Deep copy defaults to avoid mutating the module-level DEFAULT_CONFIG
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    this.config.cron.jobs_dir = resolve(configDir, "jobs");
    this.config.persona.identity_file = resolve(configDir, "IDENTITY.md");
    this.config.persona.soul_file = resolve(configDir, "SOUL.md");
  }

  get current(): DaemonConfig {
    return this.config;
  }

  load(): void {
    try {
      const stat = statSync(this.configPath);
      const raw = readFileSync(this.configPath, "utf-8");
      const parsed = YAML.parse(raw) as Partial<DaemonConfig>;
      this.config = this.merge(DEFAULT_CONFIG, parsed);
      this.lastMtime = stat.mtimeMs;

      // Always resolve relative paths
      if (!this.config.cron.jobs_dir) {
        this.config.cron.jobs_dir = resolve(this.configDir, "jobs");
      }
      if (!this.config.persona.identity_file) {
        this.config.persona.identity_file = resolve(
          this.configDir,
          "IDENTITY.md",
        );
      }
      if (!this.config.persona.soul_file) {
        this.config.persona.soul_file = resolve(this.configDir, "SOUL.md");
      }

      // Env var overrides for secrets (never commit user IDs to git)
      this.applyEnvOverrides();

      log.info("Config loaded", { path: this.configPath });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        log.info("No daemon.yaml found, using defaults", {
          path: this.configPath,
        });
      } else {
        log.error("Failed to load config", { error: String(err) });
      }
      // Still apply env overrides even when using defaults
      this.applyEnvOverrides();
    }
  }

  startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.checkReload(), POLL_INTERVAL_MS);
    log.info("Config polling started", { interval_ms: POLL_INTERVAL_MS });
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private checkReload(): void {
    try {
      const stat = statSync(this.configPath);
      if (stat.mtimeMs > this.lastMtime) {
        log.info("Config file changed, reloading");
        const prev = this.config;
        this.load();
        this.emit("reload", this.config, prev);
      }
    } catch {
      // File doesn't exist or can't stat — skip
    }
  }

  private merge(
    defaults: DaemonConfig,
    overrides: Partial<DaemonConfig>,
  ): DaemonConfig {
    const result = { ...defaults };
    for (const key of Object.keys(overrides) as (keyof DaemonConfig)[]) {
      const val = overrides[key];
      if (val === undefined) continue;
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[key] = { ...(defaults[key] as any), ...(val as any) };
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[key] = val;
      }
    }
    return result;
  }

  private applyEnvOverrides(): void {
    // TELEGRAM_ALLOWED_USERS=634688702,123456 → [634688702, 123456]
    const allowedUsers = process.env.TELEGRAM_ALLOWED_USERS;
    if (allowedUsers) {
      this.config.telegram.allowed_user_ids = allowedUsers
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
    }
  }
}
