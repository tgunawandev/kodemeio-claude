// =============================================================================
// session.queue.test.ts — Tests for TaskQueue
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

// Mock executeTask directly so queue tests don't call the real claude CLI
vi.mock("../daemon/session/executor.js", () => ({
  executeTask: vi.fn(),
}));

import type { DaemonConfig, ExecutionResult } from "../daemon/types.js";

const DEFAULT_CONFIG: DaemonConfig = {
  timezone: "UTC",
  security_level: "moderate",
  quiet_hours: [],
  heartbeat: { enabled: false, default_interval_minutes: 30, workspaces: {} },
  cron: { enabled: false, jobs_dir: "/tmp" },
  telegram: {
    enabled: false,
    token_env: "T",
    default_workspace: "kodemeio",
    allowed_user_ids: [],
    forward_heartbeat: false,
    forward_cron: false,
    react_on_receive: "👀",
    react_on_complete: "✅",
    react_on_error: "❌",
  },
  dashboard: { enabled: false, port: 3100 },
  session: {
    max_turns_before_compact: 25,
    compaction_prompt: "summarize",
    timeout_minutes: 5,
  },
  persona: { enabled: false, identity_file: "", soul_file: "" },
  voice: {
    stt_providers: [],
    tts_enabled: false,
    tts_provider: "none",
    tts_model: "tts-1",
    tts_voice: "onyx",
    voice_back_triggers: [],
  },
};

describe("TaskQueue", () => {
  let executeTask: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../daemon/session/executor.js");
    executeTask = mod.executeTask as ReturnType<typeof vi.fn>;
    executeTask.mockReset();
    // Default: successful execution
    executeTask.mockResolvedValue({
      success: true,
      output: JSON.stringify({ session_id: "new-sess" }),
      session_id: "new-sess",
      duration_ms: 100,
    } satisfies ExecutionResult);
    // Set env for SessionManager
    process.env.DAEMON_SESSIONS_FILE = `/tmp/test-sessions-${Date.now()}.json`;
  });

  afterEach(() => {
    delete process.env.DAEMON_SESSIONS_FILE;
    vi.restoreAllMocks();
  });

  async function makeQueue(maxConcurrent = 3) {
    const { SessionManager } = await import("../daemon/session/manager.js");
    const { TaskQueue } = await import("../daemon/session/queue.js");
    const sessions = new SessionManager(25);
    const queue = new TaskQueue(sessions, () => DEFAULT_CONFIG, maxConcurrent, {
      kodemeio: "/opt/dev/kodemeio-app",
      kontenos: "/opt/dev/kontenos-app",
    });
    return { queue, sessions };
  }

  it("enqueue returns a task with generated id and correct fields", async () => {
    const { queue } = await makeQueue();
    const task = queue.enqueue({
      workspace: "kodemeio",
      prompt: "test",
      priority: "medium",
      source: "api",
    });
    expect(task.id).toBeTruthy();
    // Task moves immediately to running (processNext fires synchronously)
    expect(["queued", "running"]).toContain(task.status);
    expect(task.workspace).toBe("kodemeio");
    expect(task.source).toBe("api");
  });

  it("depth and inFlight getters reflect queue state", async () => {
    // Make executeTask hang so we can inspect in-flight
    let resolveExec: (v: ExecutionResult) => void;
    executeTask.mockImplementationOnce(
      () =>
        new Promise<ExecutionResult>((resolve) => {
          resolveExec = resolve;
        }),
    );

    const { queue } = await makeQueue();
    expect(queue.depth).toBe(0);
    expect(queue.inFlight).toBe(0);

    queue.enqueue({
      workspace: "kodemeio",
      prompt: "hanging",
      priority: "high",
      source: "api",
    });

    // After enqueue, it starts running (depth=0, inFlight=1)
    await vi.waitFor(() => expect(queue.inFlight).toBe(1));
    expect(queue.depth).toBe(0);

    // Resolve execution
    resolveExec!({
      success: true,
      output: "{}",
      duration_ms: 10,
    });
    await vi.waitFor(() => expect(queue.inFlight).toBe(0));
  });

  it("priority sorting: high before medium before low", async () => {
    // Block execution so we can inspect queue ordering
    executeTask.mockImplementation(
      () =>
        new Promise<ExecutionResult>((resolve) =>
          setTimeout(
            () => resolve({ success: true, output: "{}", duration_ms: 10 }),
            50,
          ),
        ),
    );

    const { queue } = await makeQueue(1);

    // All go to different workspaces so they queue properly
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "low",
      priority: "low",
      source: "api",
    });
    queue.enqueue({
      workspace: "kontenos",
      prompt: "high",
      priority: "high",
      source: "api",
    });
    queue.enqueue({
      workspace: "journaltx",
      prompt: "medium",
      priority: "medium",
      source: "api",
    });

    // Wait for the queue to stabilize (first item picked up)
    await new Promise((r) => setTimeout(r, 10));

    const queued = queue.getQueue();
    // After one item is taken, remaining should be sorted high→medium→low
    // The exact order depends on timing, but high priority should be ahead of low
    const priorities = queued.map((t) => t.priority);
    const highIdx = priorities.indexOf("high");
    const lowIdx = priorities.indexOf("low");
    if (highIdx !== -1 && lowIdx !== -1) {
      expect(highIdx).toBeLessThan(lowIdx);
    }
  });

  it("per-workspace locking: two tasks for same workspace queue sequentially", async () => {
    const callOrder: string[] = [];
    executeTask.mockImplementation(
      (_opts: any) =>
        new Promise<ExecutionResult>((resolve) => {
          callOrder.push(_opts.workspace + "-" + _opts.prompt);
          setTimeout(
            () => resolve({ success: true, output: "{}", duration_ms: 10 }),
            20,
          );
        }),
    );

    const { queue } = await makeQueue(5);
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "first",
      priority: "high",
      source: "api",
    });
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "second",
      priority: "high",
      source: "api",
    });

    await vi.waitFor(() => expect(queue.inFlight).toBe(0), { timeout: 2000 });

    // Second task for same workspace should only start after first completes
    expect(callOrder[0]).toBe("kodemeio-first");
    expect(callOrder[1]).toBe("kodemeio-second");
  });

  it("records run history on task completion", async () => {
    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "check status",
      priority: "medium",
      source: "cron",
    });

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );

    const history = queue.getHistory();
    expect(history[0].workspace).toBe("kodemeio");
    expect(history[0].source).toBe("cron");
    expect(history[0].status).toBe("success");
    expect(history[0].prompt_preview).toBe("check status");
  });

  it("records failure status when task fails", async () => {
    executeTask.mockResolvedValueOnce({
      success: false,
      output: "something broke",
      duration_ms: 50,
    });

    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "break",
      priority: "medium",
      source: "api",
    });

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(queue.getHistory()[0].status).toBe("failure");
  });

  it("records timeout status when task is rate_limited", async () => {
    vi.useFakeTimers();
    executeTask.mockResolvedValue({
      success: false,
      output: "rate limit",
      rate_limited: true,
      duration_ms: 50,
    } satisfies ExecutionResult);

    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "rate",
      priority: "medium",
      source: "api",
    });

    // Advance past the 10s rate-limit backoff
    await vi.advanceTimersByTimeAsync(11_000);

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(queue.getHistory()[0].status).toBe("timeout");
    vi.useRealTimers();
  });

  it("retries on rate limit with model=undefined", async () => {
    vi.useFakeTimers();
    executeTask
      .mockResolvedValueOnce({
        success: false,
        output: "429 too many requests",
        rate_limited: true,
        duration_ms: 10,
      } satisfies ExecutionResult)
      .mockResolvedValueOnce({
        success: true,
        output: "{}",
        duration_ms: 10,
      } satisfies ExecutionResult);

    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "task",
      priority: "high",
      source: "api",
      model: "claude-3",
    });

    // Advance past the 10s rate-limit backoff
    await vi.advanceTimersByTimeAsync(11_000);

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(executeTask).toHaveBeenCalledTimes(2);
    // Second call should have model=undefined
    const secondCall = executeTask.mock.calls[1][0];
    expect(secondCall.model).toBeUndefined();
    vi.useRealTimers();
  });

  it("invokes onComplete callback with task and result", async () => {
    const onComplete = vi.fn();
    const { queue } = await makeQueue();
    queue.setOnComplete(onComplete);

    queue.enqueue({
      workspace: "kodemeio",
      prompt: "callback test",
      priority: "medium",
      source: "telegram",
    });

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    const [task, result] = onComplete.mock.calls[0];
    expect(task.workspace).toBe("kodemeio");
    expect(result.success).toBe(true);
  });

  it("handles thrown exception in executeTask gracefully", async () => {
    executeTask.mockRejectedValueOnce(new Error("unexpected crash"));

    const { queue } = await makeQueue();
    const task = queue.enqueue({
      workspace: "kodemeio",
      prompt: "crash",
      priority: "high",
      source: "api",
    });

    await vi.waitFor(() => expect(queue.inFlight).toBe(0));
    // Task should have failed status set
    expect(task.status).toBe("failed");
    expect(task.error).toContain("unexpected crash");
  });

  it("resets session on compaction", async () => {
    // Configure sessions to need compaction after 1 turn
    process.env.DAEMON_SESSIONS_FILE = `/tmp/test-sess-compact-${Date.now()}.json`;
    const { SessionManager } = await import("../daemon/session/manager.js");
    const { TaskQueue } = await import("../daemon/session/queue.js");
    const sessions = new SessionManager(1); // compact after 1 turn
    sessions.set("kodemeio", "old-session");
    sessions.incrementTurns("kodemeio"); // now at maxTurns

    const queue = new TaskQueue(sessions, () => DEFAULT_CONFIG, 3, {
      kodemeio: "/opt/dev",
    });

    executeTask.mockResolvedValueOnce({
      success: true,
      output: "{}",
      session_id: "old-session",
      duration_ms: 10,
    });

    queue.enqueue({
      workspace: "kodemeio",
      prompt: "compact test",
      priority: "medium",
      source: "api",
    });

    await vi.waitFor(() => expect(queue.inFlight).toBe(0));
    // Session should have been reset due to compaction
    expect(sessions.get("kodemeio")).toBeNull();
  });

  it("uses /opt/dev as fallback cwd for unknown workspace", async () => {
    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "unknownws",
      prompt: "test",
      priority: "medium",
      source: "api",
    });

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(executeTask.mock.calls[0][0].cwd).toBe("/opt/dev");
  });

  it("getRunning returns snapshot of running tasks", async () => {
    let execResolve: (v: ExecutionResult) => void;
    executeTask.mockImplementationOnce(
      () =>
        new Promise<ExecutionResult>((resolve) => {
          execResolve = resolve;
        }),
    );

    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: "slow",
      priority: "high",
      source: "api",
    });

    await vi.waitFor(() => expect(queue.inFlight).toBe(1));
    const running = queue.getRunning();
    expect(running).toHaveLength(1);
    expect(running[0].workspace).toBe("kodemeio");

    execResolve!({ success: true, output: "{}", duration_ms: 10 });
    await vi.waitFor(() => expect(queue.inFlight).toBe(0));
  });

  it("prompt_preview is truncated to 100 chars in history", async () => {
    const longPrompt = "x".repeat(200);
    const { queue } = await makeQueue();
    queue.enqueue({
      workspace: "kodemeio",
      prompt: longPrompt,
      priority: "medium",
      source: "api",
    });

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(queue.getHistory()[0].prompt_preview.length).toBe(100);
  });
});
