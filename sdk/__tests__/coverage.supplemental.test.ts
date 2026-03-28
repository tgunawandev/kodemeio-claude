// =============================================================================
// coverage.supplemental.test.ts — Additional tests to fill coverage gaps
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

// Mock executeTask for queue tests
vi.mock("../daemon/session/executor.js", () => ({
  executeTask: vi.fn(),
}));

// Mock grammy for bot tests — api object defined at top level so factory can close over it
const mockBotApiSupp = {
  sendMessage: vi.fn().mockResolvedValue({}),
  setMessageReaction: vi.fn().mockResolvedValue({}),
  sendChatAction: vi.fn().mockResolvedValue({}),
  sendVoice: vi.fn().mockResolvedValue({}),
};

vi.mock("grammy", () => {
  const Bot = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    token: string,
  ) {
    this.token = token;
    this.api = mockBotApiSupp;
    this.start = vi.fn();
    this.stop = vi.fn();
    this.use = vi.fn();
    this.command = vi.fn();
    this.on = vi.fn();
  });
  return { Bot, Context: class {}, InputFile: vi.fn() };
});

// ─── config.ts: paths in YAML that are non-empty ──────────────────────────

describe("ConfigManager path resolution from YAML", () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.resetModules();
    tmpDir = join(tmpdir(), `cfg-supp-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does not overwrite cron.jobs_dir when YAML provides a non-empty value", async () => {
    const customJobsDir = "/custom/jobs/path";
    writeFileSync(
      join(tmpDir, "daemon.yaml"),
      `cron:\n  enabled: true\n  jobs_dir: ${customJobsDir}\n`,
    );

    const { ConfigManager } = await import("../daemon/config.js");
    const manager = new ConfigManager(tmpDir);
    manager.load();

    expect(manager.current.cron.jobs_dir).toBe(customJobsDir);
  });

  it("does not overwrite persona.identity_file when YAML provides a non-empty value", async () => {
    const customId = "/custom/IDENTITY.md";
    const customSoul = "/custom/SOUL.md";
    writeFileSync(
      join(tmpDir, "daemon.yaml"),
      `persona:\n  enabled: true\n  identity_file: ${customId}\n  soul_file: ${customSoul}\n`,
    );

    const { ConfigManager } = await import("../daemon/config.js");
    const manager = new ConfigManager(tmpDir);
    manager.load();

    expect(manager.current.persona.identity_file).toBe(customId);
    expect(manager.current.persona.soul_file).toBe(customSoul);
  });
});

// ─── queue.ts: history trimmed at MAX_HISTORY ──────────────────────────────

describe("TaskQueue history trimming", () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.DAEMON_SESSIONS_FILE = `/tmp/test-sess-hist-${Date.now()}.json`;

    const { executeTask } = await import("../daemon/session/executor.js");
    const mockExec = executeTask as ReturnType<typeof vi.fn>;
    mockExec.mockResolvedValue({
      success: true,
      output: "{}",
      duration_ms: 1,
    });
  });

  afterEach(() => {
    delete process.env.DAEMON_SESSIONS_FILE;
    vi.restoreAllMocks();
  });

  it("trims history to MAX_HISTORY (200) entries", async () => {
    const { SessionManager } = await import("../daemon/session/manager.js");
    const { TaskQueue } = await import("../daemon/session/queue.js");
    const sessions = new SessionManager(25);

    // Create 10 workspaces to run concurrently
    const workspaceMap: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      workspaceMap[`ws${i}`] = `/opt/dev/ws${i}`;
    }

    const queue = new TaskQueue(
      sessions,
      () => ({
        timezone: "UTC",
        security_level: "moderate",
        quiet_hours: [],
        heartbeat: {
          enabled: false,
          default_interval_minutes: 30,
          workspaces: {},
        },
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
      }),
      10,
      workspaceMap,
    );

    // Enqueue 210 tasks in batches of 10 (one per workspace per batch)
    for (let batch = 0; batch < 21; batch++) {
      for (let ws = 0; ws < 10; ws++) {
        queue.enqueue({
          workspace: `ws${ws}`,
          prompt: `task-${batch}-${ws}`,
          priority: "medium",
          source: "api",
        });
      }
      await vi.waitFor(
        () => {
          return queue.inFlight === 0 && queue.depth === 0;
        },
        { timeout: 5000 },
      );
    }

    expect(queue.getHistory().length).toBeLessThanOrEqual(200);
  });
});

// ─── voice.ts: local whisper branch ───────────────────────────────────────

describe("transcribeVoice local path", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.WHISPER_BINARY;
  });

  it("uses local whisper when binary exists and execFile succeeds", async () => {
    process.env.WHISPER_BINARY = "/usr/local/bin/whisper-cpp";

    const fsMod = await import("node:fs");
    vi.spyOn(fsMod, "existsSync").mockImplementation((p) =>
      String(p).includes("whisper"),
    );
    vi.spyOn(fsMod, "writeFileSync").mockImplementation(() => {});
    vi.spyOn(fsMod, "unlinkSync").mockImplementation(() => {});

    const cpMod = await import("node:child_process");
    const execFileMock = cpMod.execFile as ReturnType<typeof vi.fn>;
    execFileMock.mockReset();
    // First call: ffmpeg conversion
    execFileMock.mockImplementationOnce(
      (_cmd: any, _args: any, _opts: any, cb: Function) => cb(null, "", ""),
    );
    // Second call: whisper binary
    execFileMock.mockImplementationOnce(
      (_cmd: any, _args: any, _opts: any, cb: Function) =>
        cb(null, "transcribed text\n", ""),
    );

    const { transcribeVoice } = await import("../daemon/telegram/voice.js");
    const config = {
      stt_providers: ["local" as const],
      tts_enabled: false,
      tts_provider: "none" as const,
      tts_model: "tts-1",
      tts_voice: "onyx",
      voice_back_triggers: [],
    };

    const result = await transcribeVoice(Buffer.from("audio"), config);
    expect(result).toBe("transcribed text");
  });

  it("local whisper cleans up temp files even on ffmpeg failure", async () => {
    process.env.WHISPER_BINARY = "/usr/local/bin/whisper-cpp";

    const fsMod = await import("node:fs");
    vi.spyOn(fsMod, "existsSync").mockImplementation(() => true);
    const unlinkSpy = vi
      .spyOn(fsMod, "unlinkSync")
      .mockImplementation(() => {});
    vi.spyOn(fsMod, "writeFileSync").mockImplementation(() => {});

    const cpMod = await import("node:child_process");
    const execFileMock = cpMod.execFile as ReturnType<typeof vi.fn>;
    execFileMock.mockReset();
    execFileMock.mockImplementationOnce(
      (_cmd: any, _args: any, _opts: any, cb: Function) =>
        cb(new Error("ffmpeg failed"), "", ""),
    );

    const { transcribeVoice } = await import("../daemon/telegram/voice.js");
    const config = {
      stt_providers: ["local" as const],
      tts_enabled: false,
      tts_provider: "none" as const,
      tts_model: "tts-1",
      tts_voice: "onyx",
      voice_back_triggers: [],
    };

    await expect(transcribeVoice(Buffer.from("audio"), config)).rejects.toThrow(
      "All STT providers failed",
    );
    expect(unlinkSpy).toHaveBeenCalled();
  });
});

// ─── runner.ts: daytime (same-day) quiet window ───────────────────────────

describe("HeartbeatRunner same-day quiet window", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function makeDaemonConfig(quietHours: any[]): any {
    return {
      timezone: "UTC",
      security_level: "moderate",
      quiet_hours: quietHours,
      heartbeat: {
        enabled: true,
        default_interval_minutes: 30,
        workspaces: {},
      },
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
  }

  it("suppresses heartbeat during daytime window (09:00-17:00 UTC)", async () => {
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));

    const config = makeDaemonConfig([{ start: "09:00", end: "17:00" }]);
    const enqueueMock = vi.fn().mockReturnValue({ id: "t1" });

    const { HeartbeatRunner } = await import("../daemon/heartbeat/runner.js");
    const runner = new HeartbeatRunner(
      () => config,
      { enqueue: enqueueMock } as any,
      "/tmp",
    );

    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).not.toHaveBeenCalled();
    runner.stop();
  });

  it("fires heartbeat before daytime window starts (07:00 UTC)", async () => {
    vi.setSystemTime(new Date("2025-01-15T07:00:00.000Z"));

    const config = makeDaemonConfig([{ start: "09:00", end: "17:00" }]);
    const enqueueMock = vi.fn().mockReturnValue({ id: "t1" });

    const { HeartbeatRunner } = await import("../daemon/heartbeat/runner.js");
    const runner = new HeartbeatRunner(
      () => config,
      { enqueue: enqueueMock } as any,
      "/tmp",
    );

    runner.start();
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(enqueueMock).toHaveBeenCalled();
    runner.stop();
  });
});

// ─── bot.ts: broadcastResult via onComplete callback ──────────────────────

describe("TelegramBotService broadcastResult", () => {
  beforeEach(async () => {
    vi.resetModules();
    mockBotApiSupp.sendMessage.mockClear();
    mockBotApiSupp.setMessageReaction.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeService(telegramOverrides: Record<string, any> = {}) {
    const config: any = {
      timezone: "UTC",
      security_level: "moderate",
      quiet_hours: [],
      heartbeat: {
        enabled: false,
        default_interval_minutes: 30,
        workspaces: {},
      },
      cron: { enabled: false, jobs_dir: "/tmp" },
      telegram: {
        enabled: true,
        token_env: "T",
        default_workspace: "kodemeio",
        allowed_user_ids: [100],
        forward_heartbeat: true,
        forward_cron: true,
        react_on_receive: "👀",
        react_on_complete: "✅",
        react_on_error: "❌",
        ...telegramOverrides,
      },
      dashboard: { enabled: false, port: 3100 },
      session: {
        max_turns_before_compact: 25,
        compaction_prompt: "s",
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

    const setOnCompleteMock = vi.fn();
    const mockQueue = {
      enqueue: vi.fn(),
      depth: 0,
      inFlight: 0,
      getHistory: vi.fn().mockReturnValue([]),
      setOnComplete: setOnCompleteMock,
    };
    const mockSessions = {
      getAllSessions: vi.fn().mockReturnValue({}),
      getSessionInfo: vi.fn().mockReturnValue(null),
      reset: vi.fn(),
    };

    const { TelegramBotService } = await import("../daemon/telegram/bot.js");
    const service = new TelegramBotService(
      "token",
      () => config,
      mockQueue as any,
      mockSessions as any,
    );
    service.start();

    return { service, setOnCompleteMock };
  }

  it("broadcastResult sends heartbeat message to allowed users", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    await onComplete(
      {
        id: "t1",
        source: "heartbeat",
        workspace: "kodemeio",
        prompt: "hb prompt",
        status: "completed",
      },
      { success: true, output: '{"result":"all good"}', duration_ms: 100 },
    );

    expect(mockBotApiSupp.sendMessage).toHaveBeenCalledWith(
      100,
      expect.stringContaining("Heartbeat"),
      expect.any(Object),
    );
  });

  it("broadcastResult sends cron message when forward_cron is true", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    await onComplete(
      {
        id: "t2",
        source: "cron",
        workspace: "kodemeio",
        prompt: "My cron job",
        status: "completed",
      },
      { success: true, output: "cron result", duration_ms: 200 },
    );

    expect(mockBotApiSupp.sendMessage).toHaveBeenCalledWith(
      100,
      expect.stringContaining("My cron job"),
      expect.any(Object),
    );
  });

  it("broadcastResult shows failed output for failed tasks", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    await onComplete(
      {
        id: "t3",
        source: "heartbeat",
        workspace: "kodemeio",
        prompt: "check",
        status: "failed",
      },
      { success: false, output: "something broke", duration_ms: 50 },
    );

    expect(mockBotApiSupp.sendMessage).toHaveBeenCalledWith(
      100,
      expect.stringContaining("Failed"),
      expect.any(Object),
    );
  });

  it("broadcastResult skips when allowed_user_ids is empty", async () => {
    const { setOnCompleteMock } = await makeService({
      allowed_user_ids: [],
    });
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    await onComplete(
      { id: "t4", source: "heartbeat", workspace: "kodemeio", prompt: "hb" },
      { success: true, output: "{}", duration_ms: 10 },
    );

    expect(mockBotApiSupp.sendMessage).not.toHaveBeenCalled();
  });
});
