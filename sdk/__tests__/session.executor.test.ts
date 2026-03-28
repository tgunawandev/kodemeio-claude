// =============================================================================
// session.executor.test.ts — Tests for executeTask (mocks child_process)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fs to silence logger
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

// We'll mock child_process.execFile at the factory level
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import type { ExecOptions } from "../daemon/session/executor.js";
import type { DaemonConfig } from "../daemon/types.js";

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

function makeOpts(overrides: Partial<ExecOptions> = {}): ExecOptions {
  return {
    workspace: "kodemeio",
    prompt: "do something",
    cwd: "/opt/dev",
    securityLevel: "moderate",
    timeoutMs: 30000,
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

describe("executeTask", () => {
  let execFile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const cp = await import("node:child_process");
    execFile = cp.execFile as ReturnType<typeof vi.fn>;
    execFile.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockExecFileSuccess(stdout: string, stderr: string = "") {
    execFile.mockImplementationOnce(
      (_cmd: any, _args: any, _opts: any, callback: Function) => {
        callback(null, stdout, stderr);
      },
    );
  }

  function mockExecFileError(
    error: Error,
    stdout: string = "",
    stderr: string = "",
  ) {
    execFile.mockImplementationOnce(
      (_cmd: any, _args: any, _opts: any, callback: Function) => {
        callback(error, stdout, stderr);
      },
    );
  }

  it("resolves with success=true on clean stdout", async () => {
    const output = JSON.stringify({ session_id: "sess-abc", result: "done" });
    mockExecFileSuccess(output);

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.success).toBe(true);
    expect(result.session_id).toBe("sess-abc");
    expect(result.output).toBe(output);
    expect(typeof result.duration_ms).toBe("number");
  });

  it("resolves with success=false on execFile error", async () => {
    mockExecFileError(new Error("command not found"), "", "error text");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.success).toBe(false);
    expect(result.output).toBe("error text"); // stderr preferred
  });

  it("falls back to error.message when stderr is empty", async () => {
    mockExecFileError(new Error("timeout"), "", "");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.success).toBe(false);
    expect(result.output).toBe("timeout");
  });

  it("detects rate_limited when output contains 'rate limit'", async () => {
    mockExecFileSuccess("error: rate limit exceeded");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.rate_limited).toBe(true);
    expect(result.success).toBe(false);
  });

  it("detects rate_limited when stderr contains '429'", async () => {
    mockExecFileSuccess("", "HTTP 429 too many requests");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.rate_limited).toBe(true);
  });

  it("detects rate_limited when output contains 'overloaded'", async () => {
    mockExecFileSuccess("model overloaded");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.rate_limited).toBe(true);
  });

  it("passes --resume and session_id when sessionId provided", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ sessionId: "existing-session" }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).toContain("--resume");
    expect(args).toContain("existing-session");
  });

  it("does not pass --resume when no sessionId", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ sessionId: undefined }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).not.toContain("--resume");
  });

  it("passes --model when model is explicitly set", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ model: "claude-3-5-sonnet-20241022" }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).toContain("--model");
    expect(args).toContain("claude-3-5-sonnet-20241022");
  });

  it("does not pass --model when model is undefined", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ model: undefined }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).not.toContain("--model");
  });

  it("passes --allowedTools when securityLevel is locked", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ securityLevel: "locked" }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).toContain("--allowedTools");
    const toolsIdx = args.indexOf("--allowedTools");
    expect(args[toolsIdx + 1]).toContain("Read");
  });

  it("does not pass --allowedTools for unrestricted level", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ securityLevel: "unrestricted" }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).not.toContain("--allowedTools");
  });

  it("passes --allowedTools with custom tools overrides", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts({ tools: ["Read", "CustomTool"] }));

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).toContain("--allowedTools");
    const toolsIdx = args.indexOf("--allowedTools");
    expect(args[toolsIdx + 1]).toContain("CustomTool");
  });

  it("always passes --output-format json and --dangerously-skip-permissions", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    await executeTask(makeOpts());

    const args: string[] = execFile.mock.calls[0][1];
    expect(args).toContain("--output-format");
    expect(args).toContain("json");
    expect(args).toContain("--dangerously-skip-permissions");
  });

  it("handles non-JSON stdout gracefully (session_id undefined)", async () => {
    mockExecFileSuccess("plain text output");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(makeOpts());

    expect(result.success).toBe(true);
    expect(result.session_id).toBeUndefined();
  });

  it("exposes model_used from opts.model in result", async () => {
    mockExecFileSuccess("{}");

    const { executeTask } = await import("../daemon/session/executor.js");
    const result = await executeTask(
      makeOpts({ model: "claude-3-opus-20240229" }),
    );
    expect(result.model_used).toBe("claude-3-opus-20240229");
  });
});
