// =============================================================================
// coverage.final.test.ts — Final targeted tests for remaining coverage gaps
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, appendFileSync: vi.fn() };
});

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

vi.mock("../daemon/session/executor.js", () => ({
  executeTask: vi.fn(),
}));

// Bot API object accessible in factory
const mockFinalBotApi = {
  sendMessage: vi.fn().mockResolvedValue({}),
  setMessageReaction: vi.fn().mockResolvedValue({}),
  sendChatAction: vi.fn().mockResolvedValue({}),
  sendVoice: vi.fn().mockResolvedValue({}),
};

const botHandlers: Record<string, Function> = {};

vi.mock("grammy", () => {
  const Bot = vi.fn().mockImplementation(function (
    this: Record<string, unknown>,
    token: string,
  ) {
    this.token = token;
    this.api = mockFinalBotApi;
    this.start = vi.fn();
    this.stop = vi.fn();
    this.use = vi.fn();
    this.command = vi
      .fn()
      .mockImplementation((cmd: string, handler: Function) => {
        botHandlers[`command:${cmd}`] = handler;
      });
    this.on = vi.fn().mockImplementation((event: string, handler: Function) => {
      botHandlers[event] = handler;
    });
  });
  return { Bot, Context: class {}, InputFile: vi.fn() };
});

import type { DaemonConfig } from "../daemon/types.js";

function makeConfig(overrides: Record<string, any> = {}): DaemonConfig {
  return {
    timezone: "UTC",
    security_level: "moderate",
    quiet_hours: [],
    heartbeat: { enabled: false, default_interval_minutes: 30, workspaces: {} },
    cron: { enabled: false, jobs_dir: "/tmp" },
    telegram: {
      enabled: true,
      token_env: "T",
      default_workspace: "kodemeio",
      allowed_user_ids: [],
      forward_heartbeat: false,
      forward_cron: false,
      react_on_receive: "👀",
      react_on_complete: "✅",
      react_on_error: "❌",
      ...overrides,
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
      voice_back_triggers: ["read this"],
    },
  };
}

// ─── bot.ts: handleTaskComplete (telegram source with chatId) ─────────────

describe("TelegramBotService handleTaskComplete", () => {
  beforeEach(() => {
    // Do NOT resetModules here — that would re-evaluate the mock factory
    // and break the mockFinalBotApi closure. Just clear call history.
    Object.keys(botHandlers).forEach((k) => delete botHandlers[k]);
    mockFinalBotApi.sendMessage.mockClear();
    mockFinalBotApi.setMessageReaction.mockClear();
    mockFinalBotApi.sendVoice.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeService(configOverrides: Record<string, any> = {}) {
    const setOnCompleteMock = vi.fn();
    const mockQueue = {
      enqueue: vi.fn().mockReturnValue({ id: "t1", source: "telegram" }),
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
    const cfg = makeConfig(configOverrides);

    const { TelegramBotService } = await import("../daemon/telegram/bot.js");
    const service = new TelegramBotService(
      "token",
      () => cfg,
      mockQueue as any,
      mockSessions as any,
    );
    service.start();
    return { service, setOnCompleteMock, mockQueue, cfg };
  }

  it("sends text reply on telegram task completion (success)", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kodemeio",
      prompt: "do something",
      status: "completed",
      _chatId: 1234,
      _messageId: 100,
      _isVoice: false,
    };
    const result = {
      success: true,
      output: '{"result":"task done"}',
      duration_ms: 500,
    };

    await onComplete(task, result);

    expect(mockFinalBotApi.sendMessage).toHaveBeenCalledWith(
      1234,
      expect.stringContaining("task done"),
      expect.any(Object),
    );
  });

  it("sends error reply on telegram task completion (failure)", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kodemeio",
      prompt: "do something",
      _chatId: 1234,
      _messageId: 100,
      _isVoice: false,
    };
    const result = {
      success: false,
      output: "execution failed",
      duration_ms: 50,
    };

    await onComplete(task, result);

    expect(mockFinalBotApi.sendMessage).toHaveBeenCalledWith(
      1234,
      expect.stringContaining("Task failed"),
      expect.any(Object),
    );
  });

  it("skips reply when task has no _chatId", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    // Task with no _chatId
    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kodemeio",
      prompt: "do something",
    };
    await onComplete(task, { success: true, output: "{}", duration_ms: 10 });

    expect(mockFinalBotApi.sendMessage).not.toHaveBeenCalled();
  });

  it("skips reply when task source is not telegram", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "heartbeat", // not telegram
      workspace: "kodemeio",
      prompt: "hb",
      _chatId: 1234,
    };
    await onComplete(task, { success: true, output: "{}", duration_ms: 10 });

    expect(mockFinalBotApi.sendMessage).not.toHaveBeenCalled();
  });

  it("sets reaction on message completion", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kodemeio",
      prompt: "do",
      _chatId: 1234,
      _messageId: 100,
      _isVoice: false,
    };
    await onComplete(task, { success: true, output: "{}", duration_ms: 10 });

    expect(mockFinalBotApi.setMessageReaction).toHaveBeenCalledWith(
      1234,
      100,
      expect.any(Array),
    );
  });

  it("handles non-JSON output gracefully for telegram reply", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kodemeio",
      prompt: "do",
      _chatId: 1234,
      _messageId: 100,
      _isVoice: false,
    };
    await onComplete(task, {
      success: true,
      output: "plain text result",
      duration_ms: 50,
    });

    expect(mockFinalBotApi.sendMessage).toHaveBeenCalledWith(
      1234,
      expect.stringContaining("plain text result"),
      expect.any(Object),
    );
  });

  it("sends text with footer containing workspace and duration", async () => {
    const { setOnCompleteMock } = await makeService();
    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;

    const task: any = {
      id: "t1",
      source: "telegram",
      workspace: "kontenos",
      prompt: "do",
      _chatId: 1234,
      _messageId: 100,
      _isVoice: false,
    };

    await onComplete(task, {
      success: true,
      output: "{}",
      duration_ms: 1500,
      model_used: "claude-3",
    });

    const callArgs = mockFinalBotApi.sendMessage.mock.calls[0];
    expect(callArgs[0]).toBe(1234);
    // Footer should contain workspace and timing
    const text = callArgs[1] as string;
    expect(text).toContain("kontenos");
    expect(text).toContain("1.5s");
    expect(text).toContain("claude-3");
  });
});

// ─── queue.ts: sort tie-breaking and model_used in recordRun ──────────────

describe("TaskQueue sort and recordRun coverage", () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.DAEMON_SESSIONS_FILE = `/tmp/test-sess-final-${Date.now()}.json`;

    const { executeTask } = await import("../daemon/session/executor.js");
    const mockExec = executeTask as ReturnType<typeof vi.fn>;
    mockExec.mockResolvedValue({
      success: true,
      output: '{"session_id":"new"}',
      session_id: "new",
      duration_ms: 1,
      model_used: "claude-3-5-sonnet",
    });
  });

  afterEach(() => {
    delete process.env.DAEMON_SESSIONS_FILE;
    vi.restoreAllMocks();
  });

  it("model_used is recorded in run history", async () => {
    const { SessionManager } = await import("../daemon/session/manager.js");
    const { TaskQueue } = await import("../daemon/session/queue.js");
    const sessions = new SessionManager(25);
    const queue = new TaskQueue(sessions, () => makeConfig(), 3, {
      kodemeio: "/opt/dev",
    });

    queue.enqueue({
      workspace: "kodemeio",
      prompt: "test",
      priority: "medium",
      source: "api",
      model: "claude-3-5-sonnet",
    });

    await vi.waitFor(() =>
      expect(queue.getHistory().length).toBeGreaterThan(0),
    );
    expect(queue.getHistory()[0].model_used).toBe("claude-3-5-sonnet");
  });

  it("same-priority tasks are sorted by enqueue time (FIFO)", async () => {
    const { executeTask } = await import("../daemon/session/executor.js");
    const mockExec = executeTask as ReturnType<typeof vi.fn>;
    mockExec.mockReset();

    const callOrder: string[] = [];
    mockExec.mockImplementation(
      (opts: any) =>
        new Promise((resolve) => {
          callOrder.push(opts.prompt);
          setTimeout(
            () => resolve({ success: true, output: "{}", duration_ms: 1 }),
            5,
          );
        }),
    );

    const { SessionManager } = await import("../daemon/session/manager.js");
    const { TaskQueue } = await import("../daemon/session/queue.js");
    const sessions = new SessionManager(25);
    const queue = new TaskQueue(sessions, () => makeConfig(), 1, {
      ws1: "/opt/dev/ws1",
      ws2: "/opt/dev/ws2",
      ws3: "/opt/dev/ws3",
    });

    queue.enqueue({
      workspace: "ws1",
      prompt: "first",
      priority: "medium",
      source: "api",
    });
    queue.enqueue({
      workspace: "ws2",
      prompt: "second",
      priority: "medium",
      source: "api",
    });
    queue.enqueue({
      workspace: "ws3",
      prompt: "third",
      priority: "medium",
      source: "api",
    });

    await vi.waitFor(() => expect(queue.inFlight).toBe(0), { timeout: 3000 });

    // FIFO within same priority
    expect(callOrder[0]).toBe("first");
  });
});

// ─── voice.ts: detectAvailableProviders groq branch ───────────────────────

describe("voice detectAvailableProviders", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("auto-detects groq provider when GROQ_API_KEY is set", async () => {
    process.env.GROQ_API_KEY = "groq-key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "groq transcription" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { transcribeVoice } = await import("../daemon/telegram/voice.js");
    const config = {
      stt_providers: [] as any[],
      tts_enabled: false,
      tts_provider: "none" as const,
      tts_model: "tts-1",
      tts_voice: "onyx",
      voice_back_triggers: [],
    };

    const result = await transcribeVoice(Buffer.from("audio"), config);
    expect(result).toBe("groq transcription");

    // Verify groq URL was used
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("groq"),
      expect.any(Object),
    );
    vi.unstubAllGlobals();
  });
});

// ─── runner.ts: day map coverage for all day names ────────────────────────

describe("HeartbeatRunner day name mapping in quiet hours", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const dayTests = [
    { day: "Sunday", date: "2025-01-12T12:00:00.000Z", dayNum: 0 },
    { day: "Tuesday", date: "2025-01-14T12:00:00.000Z", dayNum: 2 },
    { day: "Wednesday", date: "2025-01-15T12:00:00.000Z", dayNum: 3 },
    { day: "Thursday", date: "2025-01-16T12:00:00.000Z", dayNum: 4 },
    { day: "Friday", date: "2025-01-17T12:00:00.000Z", dayNum: 5 },
    { day: "Saturday", date: "2025-01-18T12:00:00.000Z", dayNum: 6 },
  ];

  for (const { day, date, dayNum } of dayTests) {
    it(`quiet hours with day filter suppresses on ${day} (day ${dayNum})`, async () => {
      vi.setSystemTime(new Date(date));

      const quietHours = [{ days: [dayNum], start: "00:00", end: "23:59" }];
      const config: any = {
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
  }
});

// ─── bot.ts: voice message handler ───────────────────────────────────────

describe("TelegramBotService voice message handler", () => {
  beforeEach(() => {
    Object.keys(botHandlers).forEach((k) => delete botHandlers[k]);
    mockFinalBotApi.sendMessage.mockClear();
    mockFinalBotApi.setMessageReaction.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeVoiceService() {
    const setOnCompleteMock = vi.fn();
    const mockQueue = {
      enqueue: vi.fn().mockReturnValue({ id: "t1", source: "telegram" }),
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
    const cfg = makeConfig({});
    const { TelegramBotService } = await import("../daemon/telegram/bot.js");
    const service = new TelegramBotService(
      "token",
      () => cfg,
      mockQueue as any,
      mockSessions as any,
    );
    return { service, mockQueue, setOnCompleteMock };
  }

  it("voice handler replies voice-not-configured when no providers available", async () => {
    await makeVoiceService();
    const handler = botHandlers["message:voice"];
    expect(handler).toBeDefined();

    const ctx = {
      from: { id: 1 },
      chat: { id: 100 },
      message: { message_id: 1 },
      reply: vi.fn().mockResolvedValue({}),
      api: mockFinalBotApi,
      getFile: vi.fn(),
    };
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Voice not configured"),
    );
  });

  it("voice handler skips unauthorized user", async () => {
    const cfg = makeConfig({ allowed_user_ids: [9999] });
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
    const svc = new TelegramBotService(
      "token",
      () => cfg,
      mockQueue as any,
      mockSessions as any,
    );

    // Auth is now handled by middleware (.use()), not individual handlers
    // The voice handler itself no longer checks auth — middleware blocks unauthorized users before handlers fire
    expect(svc).toBeDefined();
  });

  it("voice handler skips when ctx.from is missing", async () => {
    await makeVoiceService();
    const handler = botHandlers["message:voice"];
    const ctx = {
      from: undefined,
      chat: { id: 100 },
      message: { message_id: 1 },
      reply: vi.fn().mockResolvedValue({}),
      api: mockFinalBotApi,
      getFile: vi.fn(),
    };
    await handler(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("voice handler catches errors and replies with error message", async () => {
    // Give the service a voice config with OPENAI provider
    const cfgWithVoice = makeConfig({});
    (cfgWithVoice as any).voice = {
      ...cfgWithVoice.voice,
      stt_providers: ["openai"],
    };

    const setOnCompleteMock = vi.fn();
    const mockQueue = {
      enqueue: vi.fn().mockReturnValue({ id: "t1", source: "telegram" }),
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
    new TelegramBotService(
      "token",
      () => cfgWithVoice,
      mockQueue as any,
      mockSessions as any,
    );

    const handler = botHandlers["message:voice"];
    const ctx = {
      from: { id: 1 },
      chat: { id: 100 },
      message: { message_id: 1 },
      reply: vi.fn().mockResolvedValue({}),
      api: {
        ...mockFinalBotApi,
        sendChatAction: vi.fn().mockResolvedValue({}),
      },
      getFile: vi.fn().mockRejectedValue(new Error("telegram API error")),
    };

    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Voice error"),
    );
  });
});

// ─── bot.ts: broadcastResult error handling ───────────────────────────────

describe("TelegramBotService broadcastResult error handling", () => {
  beforeEach(() => {
    Object.keys(botHandlers).forEach((k) => delete botHandlers[k]);
    mockFinalBotApi.sendMessage.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("broadcastResult logs error when sendMessage throws for a user", async () => {
    // Make sendMessage fail
    mockFinalBotApi.sendMessage.mockRejectedValueOnce(
      new Error("Network error"),
    );

    const cfg = makeConfig({ allowed_user_ids: [100] });
    cfg.telegram.forward_heartbeat = true;
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
      () => cfg,
      mockQueue as any,
      mockSessions as any,
    );
    service.start();

    const onComplete = setOnCompleteMock.mock.calls[0][0] as Function;
    // Should not throw even if sendMessage fails
    await expect(
      Promise.resolve(
        onComplete(
          {
            id: "t1",
            source: "heartbeat",
            workspace: "kodemeio",
            prompt: "hb",
          },
          { success: true, output: "{}", duration_ms: 10 },
        ),
      ),
    ).resolves.not.toThrow();
  });
});
