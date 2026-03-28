// =============================================================================
// types.ts — Shared interfaces for the KodeClaw daemon
// =============================================================================

export interface DaemonConfig {
  timezone: string;
  security_level: SecurityLevel;
  quiet_hours: QuietWindow[];
  heartbeat: HeartbeatConfig;
  cron: CronConfig;
  telegram: TelegramConfig;
  dashboard: DashboardConfig;
  session: SessionConfig;
  persona: PersonaConfig;
  voice: VoiceConfig;
}

export type SecurityLevel = "locked" | "strict" | "moderate" | "unrestricted";

export interface QuietWindow {
  days?: number[]; // 0-6 (Sunday-Saturday), omit for all days
  start: string; // "HH:MM" 24-hour
  end: string;
}

export interface HeartbeatConfig {
  enabled: boolean;
  default_interval_minutes: number;
  workspaces: Record<
    string,
    {
      interval_minutes?: number;
      prompt_file?: string;
      enabled?: boolean;
      forward_to_telegram?: boolean;
    }
  >;
}

export interface CronConfig {
  enabled: boolean;
  jobs_dir: string;
}

export interface TelegramConfig {
  enabled: boolean;
  token_env: string;
  default_workspace: string;
  allowed_user_ids: number[];
  forward_heartbeat: boolean;
  forward_cron: boolean;
  react_on_receive: string; // emoji to react with on message receipt, e.g. "eyes"
  react_on_complete: string; // emoji on task completion, e.g. "white_check_mark"
  react_on_error: string; // emoji on error, e.g. "x"
}

export interface DashboardConfig {
  enabled: boolean;
  port: number; // Shares port with SDK server, routes are mounted
}

export interface SessionConfig {
  max_turns_before_compact: number;
  compaction_prompt: string;
  timeout_minutes: number;
}

export interface PersonaConfig {
  enabled: boolean;
  identity_file: string; // path to IDENTITY.md
  soul_file: string; // path to SOUL.md
}

export interface VoiceConfig {
  stt_providers: SttProvider[]; // ordered cascade
  tts_enabled: boolean;
  tts_provider: "openai" | "none";
  tts_model: string; // "tts-1" or "tts-1-hd"
  tts_voice: string; // "alloy", "echo", "fable", "onyx", "nova", "shimmer"
  voice_back_triggers: string[]; // phrases that trigger voice response
}

export type SttProvider = "groq" | "openai" | "local";

// ─── Workspace ──────────────────────────────────────────────────────

export interface Workspace {
  name: string;
  path: string;
  company: string;
}

export const WORKSPACES: Workspace[] = [
  { name: "kodemeio", path: "/opt/dev/kodemeio-app", company: "Kodemeio" },
  { name: "kontenos", path: "/opt/dev/kontenos-app", company: "Kontenos" },
  { name: "journaltx", path: "/opt/dev/journaltx-app", company: "JournalTX" },
  { name: "kidneuro", path: "/opt/dev/kidneuro-app", company: "KidNeuro" },
  { name: "infra", path: "/opt/dev/kodemeio-infra", company: "Kodemeio" },
  { name: "core", path: "/opt/dev/kodemeio-core", company: "Kodemeio" },
];

// ─── Task Queue ─────────────────────────────────────────────────────

export type TaskPriority = "low" | "medium" | "high";
export type TaskSource = "api" | "heartbeat" | "cron" | "telegram";
export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface QueuedTask {
  id: string;
  workspace: string;
  prompt: string;
  priority: TaskPriority;
  source: TaskSource;
  tools?: string[];
  model?: string;
  enqueued_at: number;
  started_at?: number;
  completed_at?: number;
  status: TaskStatus;
  result?: string;
  error?: string;
  session_id?: string;
}

// ─── Execution ──────────────────────────────────────────────────────

export interface ExecutionResult {
  success: boolean;
  output: string;
  session_id?: string;
  duration_ms: number;
  model_used?: string;
  rate_limited?: boolean;
}

// ─── Job Definition ─────────────────────────────────────────────────

export interface JobDefinition {
  name: string;
  schedule: string; // cron expression
  workspace: string;
  timezone?: string;
  enabled: boolean;
  one_shot: boolean;
  tools?: string[];
  priority: TaskPriority;
  timeout_minutes: number;
  forward_to_telegram: boolean;
  prompt: string; // markdown body
  file_path: string;
}

// ─── Run History ────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  source: TaskSource;
  workspace: string;
  prompt_preview: string; // first 100 chars
  status: "success" | "failure" | "timeout";
  started_at: string; // ISO
  duration_ms: number;
  model_used?: string;
  error?: string;
}

// ─── Daemon State ───────────────────────────────────────────────────

export interface DaemonState {
  started_at: string;
  subsystems: {
    heartbeat: boolean;
    cron: boolean;
    telegram: boolean;
    dashboard: boolean;
  };
  sessions: Record<string, string | null>; // workspace → session_id
  queue_depth: number;
  in_flight: number;
  recent_runs: RunRecord[];
  jobs: JobDefinition[];
  persona: { name: string; emoji: string } | null;
}
