// =============================================================================
// session/manager.ts — Workspace → session_id mapping with persistence
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createLogger } from "../logger.js";

const log = createLogger("session");

const SESSIONS_FILE =
  process.env.DAEMON_SESSIONS_FILE || "/home/dev/.claude/daemon-sessions.json";

interface SessionEntry {
  session_id: string;
  created_at: string;
  turn_count: number;
}

export class SessionManager {
  private sessions: Record<string, SessionEntry> = {};
  private maxTurns: number;

  constructor(maxTurnsBeforeCompact: number = 25) {
    this.maxTurns = maxTurnsBeforeCompact;
    this.loadFromDisk();
  }

  get(workspace: string): string | null {
    const entry = this.sessions[workspace];
    if (!entry) return null;
    if (entry.turn_count >= this.maxTurns) {
      log.warn("Session nearing context limit, will compact on next use", {
        workspace,
        turns: entry.turn_count,
      });
    }
    return entry.session_id;
  }

  set(workspace: string, sessionId: string): void {
    this.sessions[workspace] = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      turn_count: 0,
    };
    this.saveToDisk();
    log.info("Session created", { workspace, session_id: sessionId });
  }

  incrementTurns(workspace: string): number {
    const entry = this.sessions[workspace];
    if (entry) {
      entry.turn_count++;
      this.saveToDisk();
      return entry.turn_count;
    }
    return 0;
  }

  needsCompaction(workspace: string): boolean {
    const entry = this.sessions[workspace];
    return !!entry && entry.turn_count >= this.maxTurns;
  }

  reset(workspace: string): void {
    delete this.sessions[workspace];
    this.saveToDisk();
    log.info("Session reset", { workspace });
  }

  resetAll(): void {
    this.sessions = {};
    this.saveToDisk();
    log.info("All sessions reset");
  }

  getAllSessions(): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [ws, entry] of Object.entries(this.sessions)) {
      result[ws] = entry.session_id;
    }
    return result;
  }

  getSessionInfo(workspace: string): SessionEntry | null {
    return this.sessions[workspace] || null;
  }

  private loadFromDisk(): void {
    try {
      const raw = readFileSync(SESSIONS_FILE, "utf-8");
      this.sessions = JSON.parse(raw);
      log.info("Sessions loaded from disk", {
        count: Object.keys(this.sessions).length,
      });
    } catch {
      this.sessions = {};
    }
  }

  private saveToDisk(): void {
    try {
      mkdirSync(dirname(SESSIONS_FILE), { recursive: true });
      writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
    } catch (err) {
      log.error("Failed to save sessions", { error: String(err) });
    }
  }
}
