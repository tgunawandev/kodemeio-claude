// =============================================================================
// session/queue.ts — Priority task queue with per-workspace locking
// =============================================================================

import { randomUUID } from "node:crypto";
import { createLogger } from "../logger.js";
import { SessionManager } from "./manager.js";
import { executeTask } from "./executor.js";
import type {
  QueuedTask,
  TaskPriority,
  TaskSource,
  ExecutionResult,
  RunRecord,
  DaemonConfig,
} from "../types.js";

const log = createLogger("queue");

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const MAX_HISTORY = 200;

export interface EnqueueOptions {
  workspace: string;
  prompt: string;
  priority: TaskPriority;
  source: TaskSource;
  tools?: string[];
  model?: string; // explicit model override only
}

export class TaskQueue {
  private queue: QueuedTask[] = [];
  private running: Map<string, QueuedTask> = new Map(); // workspace → task
  private history: RunRecord[] = [];
  private maxConcurrent: number;
  private sessions: SessionManager;
  private getConfig: () => DaemonConfig;
  private workspacePathMap: Record<string, string>;
  private onComplete?: (task: QueuedTask, result: ExecutionResult) => void;

  constructor(
    sessions: SessionManager,
    getConfig: () => DaemonConfig,
    maxConcurrent: number,
    workspacePathMap: Record<string, string>,
  ) {
    this.sessions = sessions;
    this.getConfig = getConfig;
    this.maxConcurrent = maxConcurrent;
    this.workspacePathMap = workspacePathMap;
  }

  setOnComplete(cb: (task: QueuedTask, result: ExecutionResult) => void): void {
    this.onComplete = cb;
  }

  enqueue(opts: EnqueueOptions): QueuedTask {
    const task: QueuedTask = {
      id: randomUUID(),
      workspace: opts.workspace,
      prompt: opts.prompt,
      priority: opts.priority,
      source: opts.source,
      tools: opts.tools,
      model: opts.model, // undefined = let Claude Code decide
      enqueued_at: Date.now(),
      status: "queued",
    };

    this.queue.push(task);
    this.queue.sort(
      (a, b) =>
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] ||
        a.enqueued_at - b.enqueued_at,
    );

    log.info("Task enqueued", {
      id: task.id,
      workspace: task.workspace,
      source: task.source,
      priority: task.priority,
    });

    this.processNext().catch((err) =>
      log.error("processNext failed", { error: String(err) }),
    );
    return task;
  }

  get depth(): number {
    return this.queue.length;
  }

  get inFlight(): number {
    return this.running.size;
  }

  getQueue(): QueuedTask[] {
    return [...this.queue];
  }

  getRunning(): QueuedTask[] {
    return [...this.running.values()];
  }

  getHistory(): RunRecord[] {
    return [...this.history];
  }

  private async processNext(): Promise<void> {
    if (this.running.size >= this.maxConcurrent) return;

    const idx = this.queue.findIndex((t) => !this.running.has(t.workspace));
    if (idx === -1) return;

    const task = this.queue.splice(idx, 1)[0];
    task.status = "running";
    task.started_at = Date.now();
    this.running.set(task.workspace, task);

    const config = this.getConfig();
    const cwd = this.workspacePathMap[task.workspace] || "/opt/dev";
    const sessionId = this.sessions.get(task.workspace);

    try {
      let result = await executeTask({
        workspace: task.workspace,
        prompt: task.prompt,
        cwd,
        sessionId: sessionId || undefined,
        model: task.model, // undefined = Claude Code default
        tools: task.tools,
        securityLevel: config.security_level,
        timeoutMs: config.session.timeout_minutes * 60 * 1000,
        config,
      });

      // Handle rate limit: backoff then retry without model override
      if (result.rate_limited) {
        log.info("Rate limited, backing off 10s before retry", {
          workspace: task.workspace,
        });
        await new Promise((r) => setTimeout(r, 10_000));
        result = await executeTask({
          workspace: task.workspace,
          prompt: task.prompt,
          cwd,
          sessionId: sessionId || undefined,
          model: undefined, // let Claude Code pick
          tools: task.tools,
          securityLevel: config.security_level,
          timeoutMs: config.session.timeout_minutes * 60 * 1000,
          config,
        });
      }

      // Update session — only create new entry if session ID changed
      if (result.session_id) {
        const existing = this.sessions.get(task.workspace);
        if (existing !== result.session_id) {
          this.sessions.set(task.workspace, result.session_id);
        } else {
          this.sessions.incrementTurns(task.workspace);
        }
      } else if (sessionId) {
        this.sessions.incrementTurns(task.workspace);
      }

      if (this.sessions.needsCompaction(task.workspace)) {
        log.info("Session compaction needed", { workspace: task.workspace });
        this.sessions.reset(task.workspace);
      }

      task.status = result.success ? "completed" : "failed";
      task.completed_at = Date.now();
      task.result = result.output;
      task.session_id = result.session_id;

      this.recordRun(task, result);

      if (this.onComplete) {
        this.onComplete(task, result);
      }
    } catch (err) {
      task.status = "failed";
      task.completed_at = Date.now();
      task.error = String(err);
      log.error("Task execution error", { id: task.id, error: String(err) });
    } finally {
      this.running.delete(task.workspace);
      this.processNext().catch((err) =>
        log.error("processNext failed", { error: String(err) }),
      );
    }
  }

  private recordRun(task: QueuedTask, result: ExecutionResult): void {
    const record: RunRecord = {
      id: task.id,
      source: task.source,
      workspace: task.workspace,
      prompt_preview: task.prompt.slice(0, 100),
      status: result.success
        ? "success"
        : result.rate_limited
          ? "timeout"
          : "failure",
      started_at: new Date(task.started_at || task.enqueued_at).toISOString(),
      duration_ms: result.duration_ms,
      model_used: result.model_used,
      error: result.success ? undefined : result.output.slice(0, 200),
    };

    this.history.unshift(record);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }
  }
}
